package com.youflex.controller;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.ChatroomDTO;
import com.youflex.dto.MemberDTO;
import com.youflex.service.ChatroomService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
@RestController
@RequestMapping("/api/chatroom")
public class ChatroomController {

    @Autowired
    private ChatroomService chatroomService;

    /**
     * 로그인한 회원의 memberId를 세션에서 꺼내는 공통 헬퍼
     * ★ 프로젝트 전체가 session.setAttribute("loginMember", MemberDTO) 방식을 쓰므로
     *   (MemberController 참고) 그 규칙을 그대로 따른다. "memberId" 키는 세션에 없다.
     * @return 비로그인 상태면 null
     */
    private Integer getLoginMemberId(HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (loginMemberObj instanceof MemberDTO loginMember) {
            return loginMember.getMemberId();
        }
        return null;
    }

    /**
     * 채팅방 생성
     * ★ 프론트(app.js)가 응답을 그대로 chatroomId(숫자)로 사용하므로
     *   객체가 아니라 생성된 chatroomId만 반환한다.
     */
    @PostMapping
    public ResponseEntity<?> createChatroom(@RequestBody ChatroomDTO chatroom, HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        if (chatroomService.hasChatroom(memberId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("이미 개설한 채팅방이 있습니다.");
        }

        chatroom.setMemberId(memberId);
        int chatroomId = chatroomService.createChatroom(chatroom);
        if (chatroomId > 0) {
            return ResponseEntity.status(HttpStatus.CREATED).body(chatroomId);
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("채팅방 생성에 실패했습니다.");
    }

    /** 전체 채팅방 목록 조회 (GET /api/chatroom) */
    @GetMapping
    public ResponseEntity<List<ChatroomDTO>> getAllChatrooms(HttpSession session) {
        Integer memberId = getLoginMemberId(session); // 비로그인 시 null
        List<ChatroomDTO> list = chatroomService.getAllChatrooms(memberId);
        return ResponseEntity.ok(list);
    }

    /** 채팅방 단건 조회 */
    @GetMapping("/{chatroomId}")
    public ResponseEntity<?> getChatroom(@PathVariable("chatroomId") int chatroomId) {
        ChatroomDTO chatroom = chatroomService.getChatroom(chatroomId);
        if (chatroom == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 채팅방입니다.");
        }
        return ResponseEntity.ok(chatroom);
    }

    /** 채팅방 입장 (POST /api/chatroom/{chatroomId}/enter) */
    @PostMapping("/{chatroomId}/enter")
    public ResponseEntity<?> enterChatroom(@PathVariable("chatroomId") int chatroomId, HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            chatroomService.enterChatroom(chatroomId, memberId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }


    /** 채팅방 나가기 (POST /api/chatroom/{chatroomId}/leave) */
    @PostMapping("/{chatroomId}/leave")
    public ResponseEntity<?> leaveChatroom(@PathVariable("chatroomId") int chatroomId, HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        try {
            chatroomService.leaveChatroom(chatroomId, memberId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /** 채팅방 정보 수정 */
    @PutMapping("/{chatroomId}")
    public ResponseEntity<?> updateChatroom(@PathVariable("chatroomId") int chatroomId, @RequestBody ChatroomDTO chatroom) {
        chatroom.setChatroomId(chatroomId);
        int result = chatroomService.updateChatroom(chatroom);
        if (result > 0) {
            return ResponseEntity.ok(chatroom);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 채팅방입니다.");
    }

    /** 채팅방 삭제 */
    @DeleteMapping("/{chatroomId}")
    public ResponseEntity<?> deleteChatroom(@PathVariable("chatroomId") int chatroomId) {
        int result = chatroomService.deleteChatroom(chatroomId);
        if (result > 0) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 채팅방입니다.");
    }

    /** 회원이 이미 개설한 채팅방이 있는지 여부 확인 */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Boolean>> checkHasChatroom(HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        boolean has = chatroomService.hasChatroom(memberId);
        return ResponseEntity.ok(Map.of("hasChatroom", has));
    }

}