package com.youflex.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.MemberDTO;
import com.youflex.service.AdminReportService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

/**
 * 관리자 페이지 - 신고 처리 탭 API
 * reportType: REVIEW | COMMENT | QNA | QNA_COMMENT
 */
@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final AdminReportService adminReportService;

    // 반려, 그리고 경고처리(회원 경고는 AdminMemberController가 별도 처리) 마무리 단계에서
    // 공통으로 호출 - 신고를 '처리완료'로 전환
    @PostMapping("/{reportType}/{reportId}/resolve")
    public ResponseEntity<?> resolve(@PathVariable("reportType") String reportType,
                                      @PathVariable("reportId") int reportId,
                                      HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        adminReportService.resolve(reportType, reportId);
        return ResponseEntity.ok().build();
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
