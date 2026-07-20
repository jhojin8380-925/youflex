package com.youflex.controller.admin;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.MemberDTO;
import com.youflex.dto.PageInfo;
import com.youflex.service.MemberService;
import com.youflex.service.admin.WarningService;

import jakarta.servlet.http.HttpSession;
import lombok.Data;
import lombok.RequiredArgsConstructor;

/**
 * 관리자 페이지 - 회원 관리 탭 API
 * - 회원 목록/등업 신청/탈퇴 대기 조회, 경고 부여/차감, 강제탈퇴, 등업/탈퇴 승인·반려
 */
@RestController
@RequestMapping("/api/admin/members")
@RequiredArgsConstructor
public class AdminMemberController {

    private final MemberService memberService;
    private final WarningService warningService;

    // 회원 목록(검색 + 페이징)
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(value = "keyword", defaultValue = "") String keyword,
                                   @RequestParam(value = "page", defaultValue = "1") int page,
                                   HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        List<MemberDTO> members = memberService.getMemberList(keyword, page);
        int totalCount = memberService.getMemberListTotalCount(keyword);
        PageInfo pageInfo = PageInfo.of(page, memberService.getMemberPageSize(), totalCount);
        return ResponseEntity.ok(Map.of(
                "members", members,
                "totalCount", pageInfo.getTotalCount(),
                "totalPages", pageInfo.getTotalPages(),
                "page", pageInfo.getPage()
        ));
    }

    // 등업 신청 대기 목록
    @GetMapping("/grade-requests")
    public ResponseEntity<?> gradeRequests(HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        return ResponseEntity.ok(memberService.getGradeUpgradeRequests());
    }

    // 탈퇴(자진/강제) 처리되어 최종 삭제를 기다리는 회원 목록
    @GetMapping("/withdrawn")
    public ResponseEntity<?> withdrawn(HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        return ResponseEntity.ok(memberService.getWithdrawnMembers());
    }

    // 경고 부여 - 누적 유효 경고 3회 도달 시 서비스단에서 자동 강제탈퇴 처리됨
    @PostMapping("/{memberId}/warning")
    public ResponseEntity<?> issueWarning(@PathVariable("memberId") int memberId,
                                           @RequestBody WarningRequest request,
                                           HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        if (request.getReason() == null || request.getReason().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "경고 사유를 입력해주세요."));
        }
        warningService.issueWarning(memberId, request.getReason());
        return ResponseEntity.ok().build();
    }

    // 경고 차감(포인트 소진) - 가장 최근 유효 경고 1건 무효화
    @PostMapping("/{memberId}/warning/revoke")
    public ResponseEntity<?> revokeWarning(@PathVariable("memberId") int memberId, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        warningService.revokeWarning(memberId);
        return ResponseEntity.ok().build();
    }

    // 강제탈퇴 (회원 목록 탭) - 소프트 삭제, 탈퇴 신청 대기 목록으로 이동
    @PostMapping("/{memberId}/force-withdraw")
    public ResponseEntity<?> forceWithdraw(@PathVariable("memberId") int memberId, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        memberService.forceWithdraw(memberId);
        return ResponseEntity.ok().build();
    }

    // 등업 승인
    @PostMapping("/{memberId}/grade/approve")
    public ResponseEntity<?> approveGrade(@PathVariable("memberId") int memberId, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        memberService.approveGradeUpgrade(memberId);
        return ResponseEntity.ok().build();
    }

    // 등업 반려
    @PostMapping("/{memberId}/grade/reject")
    public ResponseEntity<?> rejectGrade(@PathVariable("memberId") int memberId, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        memberService.rejectGradeUpgrade(memberId);
        return ResponseEntity.ok().build();
    }

    // 탈퇴 승인 - 계정/작성글/댓글 완전 삭제(FK ON DELETE CASCADE, 되돌릴 수 없음)
    @PostMapping("/{memberId}/withdraw/approve")
    public ResponseEntity<?> approveWithdraw(@PathVariable("memberId") int memberId, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        memberService.approveWithdraw(memberId);
        return ResponseEntity.ok().build();
    }

    // 탈퇴 반려 - 소프트 삭제 취소, 회원을 '정상' 상태로 복구
    @PostMapping("/{memberId}/withdraw/reject")
    public ResponseEntity<?> rejectWithdraw(@PathVariable("memberId") int memberId, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        memberService.rejectWithdraw(memberId);
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

    @Data
    static class WarningRequest {
        private String reason;
    }
}
