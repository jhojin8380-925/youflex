package com.youflex.controller;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.youflex.dto.ChatroomDTO;
import com.youflex.dto.MemberDTO;
import com.youflex.exception.DuplicateChatroomException;
import com.youflex.service.ChatroomService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chatroom")
public class ChatroomController {
    private final ChatroomService chatroomService;
    // [유지] 생성 (POST)
    // 기존 프론트엔드 fetch('/api/chatroom', method: 'POST')와 연결됨
    @PostMapping
    public ResponseEntity<?> createChatroom(@RequestBody ChatroomDTO chatroom, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            chatroom.setMemberId(1);
            System.out.println("임시 경고: 로그인 세션이 없어 member_id를 강제로 1로 설정하여 진행합니다.");
        } else {
            chatroom.setMemberId(loginMember.getMemberId());
        }
        try {
            int chatroomId = chatroomService.createChatroomWithHost(chatroom);
            return ResponseEntity.ok(chatroomId);
        } catch (DuplicateChatroomException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }
    // [유지] 단건 조회 (GET)
    @GetMapping("/{chatroomId}")
    public ChatroomDTO getChatroom(@PathVariable int chatroomId) {
        return chatroomService.getChatroom(chatroomId);
    }
    // [변경] 전체 조회 (GET) - 로그인 회원의 joined 여부를 함께 내려주기 위해 세션 추가
    @GetMapping
    public List<ChatroomDTO> getAllChatrooms(HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        Integer memberId = (loginMember != null) ? loginMember.getMemberId() : null;
        return chatroomService.getAllChatrooms(memberId);
    }
    @PostMapping("/{chatroomId}/enter")
    public ResponseEntity<Void> enterChatroom(@PathVariable("chatroomId") int chatroomId, HttpSession session) {
        // MemberController와 동일하게 "loginMember" 객체로 세션을 가져옴
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");

        if (loginMember == null) {
            return ResponseEntity.status(401).build();
        }
        int memberId = loginMember.getMemberId();
        chatroomService.enterChatroom(chatroomId, memberId);
        return ResponseEntity.ok().build();
    }
//    채팅방 퇴장 메서드
    @PostMapping("/{chatroomId}/leave")
    public ResponseEntity<Void> leaveChatroom(@PathVariable("chatroomId") int chatroomId, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(401).build();
        }
        int memberId = loginMember.getMemberId();
        chatroomService.leaveChatroom(chatroomId, memberId);
        return ResponseEntity.ok().build();
    }
    // [변경] 수정 (PUT -> POST)
    // 경로 충돌 방지를 위해 매핑 주소에 "/update" 추가
    @PostMapping("/update")
    public int updateChatroom(@RequestBody ChatroomDTO chatroom) {
        return chatroomService.updateChatroom(chatroom);
    }
    // [변경] 삭제 (DELETE -> POST)
    // 보안과 데이터 변경 목적에 맞게 GET 대신 POST 사용, 주소에 "/delete" 추가
    @PostMapping("/delete/{chatroomId}")
    public int deleteChatroom(@PathVariable int chatroomId) {
        return chatroomService.deleteChatroom(chatroomId);
    }

}