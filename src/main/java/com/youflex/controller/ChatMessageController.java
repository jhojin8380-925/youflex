package com.youflex.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.ChatMessageDTO;
import com.youflex.dto.MemberDTO;
import com.youflex.mapper.ChatMessageMapper;

import jakarta.servlet.http.HttpSession;

/**
 * 채팅 메시지 관련 REST(내역 조회) + STOMP(실시간 송수신)를 한 클래스에서 처리.
 * ★ 같은 이름의 클래스가 프로젝트에 이미 있어 하나로 통합했습니다.
 *   (REST: GET /api/chatroom/{chatroomId}/messages, STOMP: /pub/chat/message)
 */
@RestController
@RequestMapping("/api/chatroom")
public class ChatMessageController {

    @Autowired
    private ChatMessageMapper chatMessageMapper;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /** 방 입장 시 이전 메시지 내역 조회 */
    @GetMapping("/{chatroomId}/messages")
    public ResponseEntity<?> getMessages(@PathVariable("chatroomId") int chatroomId, HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        List<ChatMessageDTO> messages = chatMessageMapper.getMessagesByChatroomId(chatroomId);
        return ResponseEntity.ok(messages);
    }

    /**
     * 프론트엔드에서 /pub/chat/message 로 전송하면 이 메서드가 받는다.
     * ★ 저장만 하고 바로 브로드캐스트하면 memberName이 비어 화면에 "null"로 뜨므로,
     *   저장 직후 member_loginid를 조회해서 채운 뒤 브로드캐스트한다.
     */
    @MessageMapping("/chat/message")
    public void sendMessage(ChatMessageDTO message) {
        // 1. DB에 채팅 메시지 저장
        chatMessageMapper.insertChatMessage(message);

        // 2. 로그인아이디가 아닌 '회원 이름(닉네임)'을 조회해서 채워줌
        String memberName = chatMessageMapper.selectMemberName(message.getMemberId());
        message.setMemberName(memberName != null ? memberName : "(알 수 없음)");

        // 3. 브로드캐스트
        messagingTemplate.convertAndSend("/sub/chatroom/" + message.getChatroomId(), message);
    }
}