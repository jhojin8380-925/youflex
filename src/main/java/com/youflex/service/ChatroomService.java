package com.youflex.service;

import java.util.List;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.ChatMemberDTO;
import com.youflex.dto.ChatroomDTO;
import com.youflex.exception.DuplicateChatroomException;
import com.youflex.mapper.ChatMemberMapper;
import com.youflex.mapper.ChatroomMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatroomService {

    private final ChatroomMapper chatroomMapper;
    private final ChatMemberMapper chatMemberMapper;
    private final SimpMessagingTemplate messagingTemplate; // 웹소켓 브로드캐스트용

    public int createChatroom(ChatroomDTO chatroom) {
        return chatroomMapper.createChatroom(chatroom);
    }

    /**
     * 채팅방 개설 + 개설자를 방장으로 자동 입장
     * - 한 회원당 채팅방 1개만 개설 가능하도록 체크 추가
     */
    @Transactional
    public int createChatroomWithHost(ChatroomDTO chatroom) {
        int existingCount = chatroomMapper.countChatroomByMemberId(chatroom.getMemberId());
        if (existingCount > 0) {
            throw new DuplicateChatroomException("이미 개설한 채팅방이 있습니다. 한 사람당 하나의 채팅방만 개설할 수 있습니다.");
        }

        chatroomMapper.createChatroom(chatroom);

        ChatMemberDTO host = ChatMemberDTO.builder()
                .memberId(chatroom.getMemberId())
                .chatroomId(chatroom.getChatroomId())
                .chatMemberRole("방장")
                .chatMemberStatus("참여중")
                .build();
        chatMemberMapper.insertChatMember(host);

        // 방 개설 후 최신 목록을 구독중인 모든 클라이언트에게 실시간 전송
        broadcastChatroomList();

        return chatroom.getChatroomId();
    }

    public ChatroomDTO getChatroom(int chatroomId) {
        return chatroomMapper.selectChatroomById(chatroomId);
    }

    public List<ChatroomDTO> getAllChatrooms() {
        return chatroomMapper.selectAllChatrooms();
    }

    public int updateChatroom(ChatroomDTO chatroom) {
        return chatroomMapper.updateChatroom(chatroom);
    }

    public int deleteChatroom(int chatroomId) {
        int result = chatroomMapper.deleteChatroom(chatroomId);
        // 삭제 시에도 실시간 반영
        broadcastChatroomList();
        return result;
    }

    /**
     * 현재 채팅방 목록을 /sub/chatroom-list 구독자 전체에게 전송
     */
    private void broadcastChatroomList() {
        List<ChatroomDTO> rooms = chatroomMapper.selectAllChatrooms();
        messagingTemplate.convertAndSend("/sub/chatroom-list", rooms);
    }

    /**
     * 일반 사용자 채팅방 입장 처리
     * - 이미 참여 중인 방에 다시 입장할 때 발생하는 DuplicateKeyException(중복 키 에러) 방어 처리
     */
    @Transactional
    public void enterChatroom(int chatroomId, int memberId) {
        try {
            ChatMemberDTO participant = ChatMemberDTO.builder()
                    .memberId(memberId)
                    .chatroomId(chatroomId)
                    .chatMemberRole("참여자")
                    .chatMemberStatus("참여중")
                    .build();
                    
            chatMemberMapper.insertChatMember(participant);
        } catch (org.springframework.dao.DuplicateKeyException e) {
            // 이미 입장한 상태라면 에러를 발생시키지 않고 정상 처리(재입장)로 간주
            System.out.println("이미 해당 채팅방에 입장한 회원입니다. (memberId: " + memberId + ", chatroomId: " + chatroomId + ")");
        }
    }
}