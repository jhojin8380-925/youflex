package com.youflex.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.MemberDTO;
import com.youflex.dto.NotificationsDTO;
import com.youflex.service.NotificationsService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

/**
 * 헤더 🔔 알림 API 컨트롤러
 * - 알림 목록 조회(새로고침/재접속 시 유지), 전체 읽음 처리, 개별/전체 삭제
 * - 채팅방 전용 알림(ChatroomController)과는 별개
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationsController {

    private final NotificationsService notificationsService;

    // 로그인한 회원의 memberId를 세션에서 꺼내는 공통 헬퍼 (클라이언트가 보낸 값은 신뢰하지 않음)
    private Integer getLoginMemberId(HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (loginMemberObj instanceof MemberDTO loginMember) {
            return loginMember.getMemberId();
        }
        return null;
    }

    // 헤더 알림 패널 최초 로드
    @GetMapping
    public ResponseEntity<List<NotificationsDTO>> getNotifications(HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(notificationsService.getNotifications(memberId));
    }

    // 알림 패널을 열었을 때 전부 읽음 처리
    @PostMapping("/read")
    public ResponseEntity<Void> markAllRead(HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        notificationsService.markAllRead(memberId);
        return ResponseEntity.ok().build();
    }

    // 개별 삭제(✕ 버튼)
    @DeleteMapping("/{notificationsId}")
    public ResponseEntity<Void> deleteNotification(@PathVariable("notificationsId") int notificationsId, HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        notificationsService.deleteNotification(notificationsId, memberId);
        return ResponseEntity.noContent().build();
    }

    // 전체 삭제 버튼
    @DeleteMapping
    public ResponseEntity<Void> deleteAll(HttpSession session) {
        Integer memberId = getLoginMemberId(session);
        if (memberId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        notificationsService.deleteAll(memberId);
        return ResponseEntity.noContent().build();
    }
}
