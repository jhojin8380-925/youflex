package com.youflex.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.MemberDTO;
import com.youflex.service.BadWordService;

import jakarta.servlet.http.HttpSession;
import lombok.Data;
import lombok.RequiredArgsConstructor;

/**
 * 금칙어(bad_word) 목록 관리 API 컨트롤러 (관리자 전용)
 * - 리뷰/댓글/Q&A 작성 시 필터링에 사용할 단어를 등록/삭제
 */
@RestController
@RequestMapping("/api/badword")
@RequiredArgsConstructor
public class BadWordController {

    private final BadWordService badWordService;

    @PostMapping
    public ResponseEntity<?> createBadWord(@RequestBody BadWordRequest request, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        if (request.getBadWordContent() == null || request.getBadWordContent().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "등록할 단어를 입력해주세요."));
        }
        badWordService.registerBadWord(request.getBadWordContent().trim());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{badWordId}")
    public ResponseEntity<?> deleteBadWord(@PathVariable("badWordId") int badWordId, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        badWordService.removeBadWord(badWordId);
        return ResponseEntity.noContent().build();
    }

    // 등록 요청 바디 - { badWordContent }
    @Data
    static class BadWordRequest {
        private String badWordContent;
    }

    // 세션의 로그인 회원이 관리자 등급인지 확인 (memberGrade == '관리자')
    private boolean isAdmin(HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        return loginMemberObj instanceof MemberDTO loginMember
                && "관리자".equals(loginMember.getMemberGrade());
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "관리자만 접근할 수 있습니다."));
    }
}
