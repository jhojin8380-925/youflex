package com.youflex.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.ChatMemberDTO;
import com.youflex.dto.ChatMessageDTO;
import com.youflex.dto.ChatroomDTO;
import com.youflex.exception.AlreadyInRoomException;
import com.youflex.mapper.ChatMemberMapper;
import com.youflex.mapper.ChatMessageMapper;
import com.youflex.mapper.ChatWarningMapper;
import com.youflex.mapper.ChatroomMapper;

@Service
public class ChatroomService {

    @Autowired
    private ChatroomMapper chatroomMapper;

    @Autowired
    private ChatMemberMapper chatMemberMapper;

    // ★ 추가: 경고 부여 기능에 필요한 Mapper 2개
    @Autowired
    private ChatWarningMapper chatWarningMapper;

    @Autowired
    private ChatMessageMapper chatMessageMapper;

    @Autowired
    private org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Autowired
    private NotificationsService notificationsService;

    // ★ 추가: 강제퇴장 처리 기준 경고 횟수
    private static final int MAX_WARNING_COUNT = 3;

    /**
     * 시스템 입장/퇴장/경고/강퇴 메시지를 DB에 저장하고 해당 채팅방으로 실시간 브로드캐스트하며,
     * 채팅방 전용 🔔 알림 패널용으로 현재 방에 남아있는 참여자 각각에게 알림을 DB에 적재한다
     * (새로고침/재접속해도 유지되고, 개별 삭제도 가능하도록).
     */
    private void sendSystemMessage(int chatroomId, int memberId, String actionText) {
        try {
            String memberName = chatMessageMapper.selectMemberName(memberId);
            if (memberName == null) memberName = "회원";
            String content = "'" + memberName + "'님이 " + actionText;

            ChatMessageDTO systemMsg = ChatMessageDTO.builder()
                    .chatroomId(chatroomId)
                    .memberId(memberId)
                    .memberName("SYSTEM")
                    .chatMessageContent(content)
                    .build();

            // 1. DB 저장 (새로고침해도 보존됨)
            chatMessageMapper.insertChatMessage(systemMsg);

            // 2. 채팅방 전용 🔔 알림을 DB에 먼저 반영 (브로드캐스트를 받은 클라이언트가 바로 다시 조회해도
            //    실제 notifications_id가 이미 존재하도록, 브로드캐스트보다 먼저 처리)
            String notifType = resolveChatNotifType(actionText);
            List<ChatMemberDTO> members = chatMemberMapper.selectMembersByChatroomId(chatroomId);
            boolean actorStillInRoom = false;
            for (ChatMemberDTO member : members) {
                notificationsService.recordChatRoomNotification(member.getMemberId(), notifType, content);
                if (member.getMemberId() == memberId) {
                    actorStillInRoom = true;
                }
            }
            // ★ 강퇴 시점에는 대상 회원의 chat_member 상태가 이미 '강퇴'로 바뀐 뒤라서 위 목록에 없음.
            //   그래도 본인 알림 내역에는 "강퇴되었다"는 기록이 남아야 하므로 별도로 챙겨서 적재한다.
            if ("강퇴".equals(notifType) && !actorStillInRoom) {
                notificationsService.recordChatRoomNotification(memberId, notifType, content);
            }

            // 3. 실시간 STOMP 브로드캐스트
            messagingTemplate.convertAndSend("/sub/chatroom/" + chatroomId, systemMsg);
        } catch (Exception e) {
            // 시스템 메시지 처리 실패 시 로그 기록 후 기존 흐름 유지
            e.printStackTrace();
        }
    }

    // actionText 문구로 채팅방 알림 종류(입장/퇴장/경고/강퇴)를 판별
    private String resolveChatNotifType(String actionText) {
        if (actionText.contains("강제퇴장") || actionText.contains("강제 삭제")) return "강퇴";
        if (actionText.contains("입장")) return "입장";
        if (actionText.contains("퇴장")) return "퇴장";
        if (actionText.contains("경고")) return "경고";
        return "채팅";
    }

    /**
     * ★ 추가: 운영자가 채팅방을 강제삭제하기 직전에, 남아있는 참여자들에게 안내 방송 + 개인 알림을 남긴다.
     * (실제 삭제는 ChatroomController에서 이 호출 직후 deleteChatroom()으로 이어서 처리)
     */
    public void notifyForceDeleteByAdmin(int chatroomId, int adminMemberId) {
        sendSystemMessage(chatroomId, adminMemberId, "운영자 권한으로 채팅방을 강제 삭제했습니다.");
    }

    /** 회원이 이미 개설한 채팅방이 있는지 여부 */
    public boolean hasChatroom(Integer memberId) {
        return chatroomMapper.countChatroomByMemberId(memberId) > 0;
    }

    /**
     * 채팅방 생성 후 생성된 chatroomId 반환
     * - 개설자를 chat_member에 "방장" / "참여중" 상태로 함께 등록한다.
     */
    @Transactional
    public int createChatroom(ChatroomDTO chatroom) {
        try {
            // DB에 UNIQUE 제약조건이 걸려있으므로, 중복 제목이면 여기서 에러가 발생합니다.
            chatroomMapper.createChatroom(chatroom);
        } catch (DuplicateKeyException e) {
            // DB 에러를 잡아서 프론트엔드에 보낼 깔끔한 메시지로 바꿔서 다시 던집니다.
            throw new IllegalStateException("이미 사용 중인 방 제목입니다.");
        }

        int chatroomId = chatroom.getChatroomId(); // useGeneratedKeys로 채워진 PK
        chatMemberMapper.insertChatMember(chatroom.getMemberId(), chatroomId, "방장", "참여중");
        return chatroomId;
    }

    /** 전체 채팅방 목록 조회 */
    public List<ChatroomDTO> getAllChatrooms(Integer memberId) {
        return chatroomMapper.selectAllChatrooms(memberId);
    }

    /** 채팅방 단건 조회 */
    public ChatroomDTO getChatroom(int chatroomId) {
        return chatroomMapper.selectChatroomById(chatroomId);
    }

    /** 채팅방 정보 수정 */
    public int updateChatroom(ChatroomDTO chatroom) {
        return chatroomMapper.updateChatroom(chatroom);
    }

    /**
     * 채팅방 삭제
     * - chat_member는 FK ON DELETE CASCADE로도 정리되지만, 명시적으로 먼저 비워서 안전하게 처리
     */
    @Transactional
    public int deleteChatroom(int chatroomId) {
        chatMemberMapper.deleteAllChatMembersByChatroomId(chatroomId);
        return chatroomMapper.deleteChatroom(chatroomId);
    }

    /**
     * 채팅방 입장
     * - 방 존재 여부 확인
     * - 이미 '이 방'에 참여 중이면 그대로 통과 (idempotent)
     * - 다른 방에 이미 '참여중'인 상태라면 예외 발생 (1인 1방 제한)
     * - 없으면 새로 등록: 방 개설자 본인이면 "방장", 아니면 "참여자"
     */

    public boolean enterChatroom(int chatroomId, int memberId) {
        ChatroomDTO chatroom = chatroomMapper.selectChatroomById(chatroomId);
        if (chatroom == null) {
            throw new IllegalArgumentException("존재하지 않는 채팅방입니다.");
        }

        // ★ 0. 강퇴 이력 확인 — 강퇴당한 채팅방에는 재입장 불가
        int kickedCount = chatMemberMapper.isKickedFromChatroom(chatroomId, memberId);
        if (kickedCount > 0) {
            throw new IllegalStateException("강퇴당한 채팅방에는 다시 입장할 수 없습니다.");
        }

        // 1. 이미 '현재 방'에 참여 중인지 확인 (재입장)
        String existingRole = chatMemberMapper.selectChatMemberRole(chatroomId, memberId);
        if (existingRole != null) {
            return false;
        }

        // 2. 다른 방에 이미 '참여중'인지 확인 (하나의 쿼리로 통일)
        Integer activeRoomId = chatMemberMapper.selectActiveChatroomIdByMemberId(memberId);
        if (activeRoomId != null) {
            ChatroomDTO activeRoom = chatroomMapper.selectChatroomById(activeRoomId);
            String title = (activeRoom != null) ? activeRoom.getChatroomTitle() : "알 수 없는 방";
            throw new AlreadyInRoomException(activeRoomId, title);
        }

        // ★ 2.5 인원수 초과 검사 (신규 추가)
        // 현재 방에 참여 중인 전체 인원수를 가져옵니다.
        int currentCount = chatMemberMapper.countMembersInChatroom(chatroomId);
        
        if (currentCount >= chatroom.getChatroomMaxMember()) {
            throw new IllegalStateException("채팅방 인원이 가득 찼습니다.");
        }

        // 3. 신규 입장 처리
        String role = (chatroom.getMemberId() == memberId) ? "방장" : "참여자";
        chatMemberMapper.insertChatMember(memberId, chatroomId, role, "참여중");

        // ★ 신규 입장 시스템 메시지 생성, DB 저장 및 실시간 브로드캐스트
        sendSystemMessage(chatroomId, memberId, "입장했습니다.");
        return true;
    }
    /**
     * 채팅방 나가기
     * - 참여자가 나가면: chat_member 기록만 삭제
     * - 방장이 나가면: 채팅방 자체를 삭제 (모든 참여자 강제 퇴장)
     */
    @Transactional
    public void leaveChatroom(int chatroomId, int memberId) {
        // 1. 나가려는 사람의 역할 확인
        String role = chatMemberMapper.selectChatMemberRole(chatroomId, memberId);
        if (role == null) {
            throw new IllegalArgumentException("참여 중인 채팅방이 아닙니다.");
        }

        if ("방장".equals(role)) {
            // 방장이 나가는 경우 -> 채팅방 전체 삭제
            chatMemberMapper.deleteAllChatMembersByChatroomId(chatroomId);
            chatroomMapper.deleteChatroom(chatroomId);
        } else {
            // 일반 참여자가 나가는 경우 -> 본인 기록만 삭제
            int result = chatMemberMapper.deleteChatMember(chatroomId, memberId);
            if (result <= 0) {
                throw new IllegalArgumentException("참여 중인 채팅방이 아닙니다.");
            }
            // ★ 퇴장 시스템 메시지 생성, DB 저장 및 실시간 브로드캐스트
            sendSystemMessage(chatroomId, memberId, "퇴장했습니다.");
        }
    }

    /**
     * ★ 추가: 특정 회원의 특정 방 내 역할 조회 (방장 / 참여자 / 없음)
     * - 프론트에서 경고 버튼 노출 여부를 판단하는 데 사용
     */
    public String getMemberRole(int chatroomId, int memberId) {
        return chatMemberMapper.selectChatMemberRole(chatroomId, memberId);
    }

    /**
     * ★ 추가: 특정 채팅방의 현재 실시간 참여자 목록 조회 (방장이 상단에 위치하도록 정렬)
     */
    public List<com.youflex.dto.ChatMemberDTO> getChatroomMembers(int chatroomId) {
        return chatMemberMapper.selectMembersByChatroomId(chatroomId);
    }

    /**
     * ★ 수정: 특정 메시지에 경고 부여
     * - 방장만 가능
     * - 경고 누적 MAX_WARNING_COUNT(3)회 이상이면 해당 회원 강제퇴장
     * @return 결과를 담은 Map (kicked, targetMemberId, totalWarnings 포함)
     */
    @Transactional
    public Map<String, Object> giveWarning(int chatroomId, int giverMemberId, int chatMessageId, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("경고 사유를 입력해주세요.");
        }

        // 1. 요청자가 방장인지 확인
        String giverRole = chatMemberMapper.selectChatMemberRole(chatroomId, giverMemberId);
        if (!"방장".equals(giverRole)) {
            throw new IllegalStateException("방장만 경고를 부여할 수 있습니다.");
        }

        // 2. 대상 메시지 조회 (작성자 확인용)
        ChatMessageDTO message = chatMessageMapper.selectChatMessageById(chatMessageId);
        if (message == null || message.getChatroomId() != chatroomId) {
            throw new IllegalArgumentException("존재하지 않는 메시지입니다.");
        }

        int targetMemberId = message.getMemberId();

        // 3. 방장 본인 메시지에는 경고 불가
        if (targetMemberId == giverMemberId) {
            throw new IllegalArgumentException("본인 메시지에는 경고를 부여할 수 없습니다.");
        }

        // 4. 동일 메시지에 대해 같은 대상 회원에게 중복 경고 금지
        int alreadyWarnedCount = chatWarningMapper.countWarningByMessage(chatroomId, targetMemberId, chatMessageId);
        if (alreadyWarnedCount > 0) {
            throw new IllegalStateException("이미 이 메시지에 경고를 부여했습니다.");
        }

        // 5. 경고 기록 저장
        chatWarningMapper.insertWarning(targetMemberId, chatroomId, chatMessageId, reason);

        // 5. 누적 경고 횟수 확인
        int totalWarnings = chatWarningMapper.countWarnings(chatroomId, targetMemberId);

        // ★ 5.1 경고 부여 사유 멘트를 시스템 메시지로 저장/브로드캐스트 + 채팅방 🔔 알림에도 반영
        sendSystemMessage(chatroomId, targetMemberId,
                "경고를 받았습니다. (누적 " + totalWarnings + "/3회)\n사유: " + reason);

        // 6. 3회 이상일 때 강제퇴장 처리
        boolean kicked = false;
        if (totalWarnings >= MAX_WARNING_COUNT) {
            // ★ 수정: 물리 삭제 대신 상태를 '강퇴'로 변경하여 재입장 차단 이력을 남김
            chatMemberMapper.updateStatusToKicked(chatroomId, targetMemberId);
            kicked = true;

            // ★ 강퇴 시스템 메시지 생성, DB 저장 및 실시간 브로드캐스트
            sendSystemMessage(chatroomId, targetMemberId, "강제퇴장되었습니다.");
        }

        // ★ 컨트롤러에서 필요한 정보들을 Map에 담아 반환
        return Map.of(
            "kicked", kicked,
            "targetMemberId", targetMemberId,
            "totalWarnings", totalWarnings
        );
    }
}