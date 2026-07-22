package com.youflex.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // ★ 추가: 강제퇴장 처리 기준 경고 횟수
    private static final int MAX_WARNING_COUNT = 3;

    /**
     * 시스템 입/퇴장/강퇴 메시지를 DB에 저장하고 해당 채팅방으로 실시간 브로드캐스트한다.
     */
    private void sendSystemMessage(int chatroomId, int memberId, String actionText) {
        try {
            String memberName = chatMessageMapper.selectMemberName(memberId);
            if (memberName == null) memberName = "회원";

            ChatMessageDTO systemMsg = ChatMessageDTO.builder()
                    .chatroomId(chatroomId)
                    .memberId(memberId)
                    .memberName("SYSTEM")
                    .chatMessageContent("'" + memberName + "'님이 " + actionText)
                    .build();

            // 1. DB 저장 (새로고침해도 보존됨)
            chatMessageMapper.insertChatMessage(systemMsg);

            // 2. 실시간 STOMP 브로드캐스트
            messagingTemplate.convertAndSend("/sub/chatroom/" + chatroomId, systemMsg);
        } catch (Exception e) {
            // 시스템 메시지 처리 실패 시 로그 기록 후 기존 흐름 유지
            e.printStackTrace();
        }
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
     * - chat_member 참여 기록을 물리 삭제한다.
     */
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
     * 특정 채팅방의 이전 메시지 목록 조회
     * - 아직 메시지 전용 Mapper/테이블이 없다면 500 에러 방지를 위해 빈 리스트를 반환합니다.
     */
    public List<?> getMessagesByChatroomId(int chatroomId) {
        // 추후 메시지 매퍼가 구현되면 아래와 같이 연동할 수 있습니다.
        // return chatMessageMapper.selectMessagesByChatroomId(chatroomId);
        
        return new ArrayList<>();
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
     * ★ 추가: 특정 메시지에 경고 부여
     * - 방장만 가능
     * - 경고 누적 MAX_WARNING_COUNT(3)회 이상이면 해당 회원 강제퇴장
     * @return 강제퇴장 처리되었으면 true
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

        // ★ 5.1 경고 부여 사유 멘트를 DB chat_message에 저장하고 실시간 브로드캐스트 (새로고침 시에도 보존됨)
        String targetName = chatMessageMapper.selectMemberName(targetMemberId);
        if (targetName == null) targetName = "회원";
        String warnText = " '" + targetName + "'님이 경고를 받았습니다. (누적 " + totalWarnings + "/3회)\n사유: " + reason;
        
        ChatMessageDTO warnSystemMsg = ChatMessageDTO.builder()
                .chatroomId(chatroomId)
                .memberId(targetMemberId)
                .memberName("SYSTEM")
                .chatMessageContent(warnText)
                .build();
        chatMessageMapper.insertChatMessage(warnSystemMsg);
        messagingTemplate.convertAndSend("/sub/chatroom/" + chatroomId, warnSystemMsg);

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