package com.youflex.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.youflex.dto.ChatroomDTO;
import com.youflex.exception.AlreadyInRoomException;
import com.youflex.mapper.ChatMemberMapper;
import com.youflex.mapper.ChatroomMapper;

@Service
public class ChatroomService {

    @Autowired
    private ChatroomMapper chatroomMapper;

    @Autowired
    private ChatMemberMapper chatMemberMapper;

    /** 회원이 이미 개설한 채팅방이 있는지 여부 */
    public boolean hasChatroom(Integer memberId) {
        return chatroomMapper.countChatroomByMemberId(memberId) > 0;
    }

    /**
     * 채팅방 생성 후 생성된 chatroomId 반환
     * - 개설자를 chat_member에 "방장" / "참여중" 상태로 함께 등록한다.
     */
    public int createChatroom(ChatroomDTO chatroom) {
        chatroomMapper.createChatroom(chatroom);
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

        // 3. 신규 입장 처리
        String role = (chatroom.getMemberId() == memberId) ? "방장" : "참여자";
        chatMemberMapper.insertChatMember(memberId, chatroomId, role, "참여중");
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
}