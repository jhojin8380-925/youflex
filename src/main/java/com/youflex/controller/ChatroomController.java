package com.youflex.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
import com.youflex.exception.AlreadyInRoomException;
import com.youflex.service.ChatroomService;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/chatroom")
public class ChatroomController {

    @Autowired
    private ChatroomService chatroomService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 로그인한 회원의 memberId를 세션에서 꺼내는 공통 헬퍼
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
    /**
     * 채팅방 생성
     * ★ 프론트(app.js)가 응답을 받아 바로 입장할 수 있도록 생성된 chatroomId(숫자)를 반환한다.
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
        
        try {
            // Service 실행 (방 생성 + 방장 등록) 및 생성된 PK(chatroomId) 반환 받기
            int chatroomId = chatroomService.createChatroom(chatroom);
            
            // ★ 수정 포인트: 텍스트가 아니라 방금 만들어진 방의 ID(숫자)를 반환합니다.
            return ResponseEntity.status(HttpStatus.CREATED).body(chatroomId);
            
        } catch (IllegalStateException e) {
            // 중복된 제목일 경우 프론트로 409 상태와 에러 메시지 전송
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
            
        } catch (Exception e) {
            // 기타 알 수 없는 서버 에러 처리
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("채팅방 생성에 실패했습니다.");
        }
    }
    /** 채팅방 목록 조회 */
    @GetMapping
    public ResponseEntity<?> getAllChatrooms(HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        return ResponseEntity.ok(chatroomService.getAllChatrooms(memberId));
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
            boolean isNew = chatroomService.enterChatroom(chatroomId, memberId);
            return ResponseEntity.ok(Map.of("isNew", isNew));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (AlreadyInRoomException e) {
            Map<String, Object> body = Map.of(
                "error", "ALREADY_IN_ROOM",
                "message", e.getMessage(),
                "existingRoomId", e.getExistingRoomId(),
                "existingRoomTitle", e.getExistingRoomTitle()
            );
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
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
    public ResponseEntity<?> updateChatroom(@PathVariable("chatroomId") int chatroomId,
            @RequestBody ChatroomDTO chatroom, HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ChatroomDTO existingChatroom = chatroomService.getChatroom(chatroomId);
        if (existingChatroom == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 채팅방입니다.");
        }
        if (existingChatroom.getMemberId() != memberId) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("방장만 채팅방 정보를 수정할 수 있습니다.");
        }

        chatroom.setChatroomId(chatroomId);
        chatroom.setMemberId(memberId);
        int result = chatroomService.updateChatroom(chatroom);
        if (result > 0) {
            return ResponseEntity.ok(chatroom);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 채팅방입니다.");
    }

    /** 채팅방 삭제 */
    @DeleteMapping("/{chatroomId}")
    public ResponseEntity<?> deleteChatroom(@PathVariable("chatroomId") int chatroomId, HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ChatroomDTO existingChatroom = chatroomService.getChatroom(chatroomId);
        if (existingChatroom == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("존재하지 않는 채팅방입니다.");
        }
        if (existingChatroom.getMemberId() != memberId) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("방장만 채팅방을 삭제할 수 있습니다.");
        }

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

    /**
     * 현재 로그인한 회원의 해당 방 내 역할 조회
     * - 프론트에서 방장 여부를 판단해 "⚠ 경고" 버튼 노출 여부를 결정하는 데 사용
     */
    @GetMapping("/{chatroomId}/role")
    public ResponseEntity<?> getMyRole(@PathVariable("chatroomId") int chatroomId, HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        String role = chatroomService.getMemberRole(chatroomId, memberId);
        return ResponseEntity.ok(Map.of("role", role == null ? "" : role));
    }

    /**
     * 특정 채팅방의 현재 실시간 참여자 목록 조회 (방장 상단 고정)
     */
    @GetMapping("/{chatroomId}/members")
    public ResponseEntity<?> getChatroomMembers(@PathVariable("chatroomId") int chatroomId, HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        return ResponseEntity.ok(chatroomService.getChatroomMembers(chatroomId));
    }

    /**
     * 특정 메시지에 경고 부여 (방장 전용)
     * - 경고 누적 3회 이상 시 서버에서 자동으로 해당 회원을 강제퇴장 처리
     * - 대상 회원에게만 개인 채널로 즉시 안내 전송
     */
    @PostMapping("/{chatroomId}/warning")
    public ResponseEntity<?> giveWarning(
            @PathVariable("chatroomId") int chatroomId,
            @RequestBody Map<String, Object> body,
            HttpSession session) {

        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Object rawMessageId = body.get("chatMessageId");
        if (rawMessageId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("대상 메시지 정보가 없습니다.");
        }
        int chatMessageId = ((Number) rawMessageId).intValue();
        String reason = (String) body.get("reason");

        try {
            Map<String, Object> result = chatroomService.giveWarning(chatroomId, memberId, chatMessageId, reason);
            boolean kicked = (boolean) result.get("kicked");
            int targetMemberId = (int) result.get("targetMemberId");
            int totalWarnings = (int) result.get("totalWarnings");

            // 대상 회원 개인 채널로 즉시 안내 전송
            Map<String, Object> notice;
            if (kicked) {
                notice = Map.of(
                    "type", "KICKED",
                    "chatroomId", chatroomId,
                    "message", "경고 누적(" + totalWarnings + "회)으로 채팅방에서 강제퇴장되었습니다.",
                    "reason", "사유: " + reason
                );
            } else {
                notice = Map.of(
                    "type", "WARNING",
                    "chatroomId", chatroomId,
                    "message", "경고를 받았습니다. (누적 " + totalWarnings + "/3회)\n사유: " + reason
                );
            }
            
            messagingTemplate.convertAndSend("/sub/member/" + targetMemberId + "/notice", (Object) notice);
            return ResponseEntity.ok(Map.of("kicked", kicked));
            
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}