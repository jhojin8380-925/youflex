package com.youflex.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.youflex.dto.MemberDTO;
import com.youflex.service.AdminReportService;
import com.youflex.service.MemberService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

/**
 * 관리자 페이지(/admin) 화면 렌더링
 * - memberGrade가 '관리자'가 아니면 메인으로 리다이렉트
 */
@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminViewController {

    private final MemberService memberService;
    private final AdminReportService adminReportService;

    @GetMapping
    public String adminPage(HttpSession session, Model model) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember) || !"관리자".equals(loginMember.getMemberGrade())) {
            return "redirect:/";
        }

        // 회원 관리 탭 초기 데이터(1페이지, 검색어 없음). 이후 검색/페이지 이동은 JS에서
        // /api/admin/members를 fetch로 호출해 테이블만 갱신함.
        model.addAttribute("memberList", memberService.getMemberList("", 1));
        model.addAttribute("memberTotalCount", memberService.getMemberListTotalCount(""));
        model.addAttribute("memberPageSize", memberService.getMemberPageSize());
        model.addAttribute("gradeRequests", memberService.getGradeUpgradeRequests());
        model.addAttribute("withdrawnMembers", memberService.getWithdrawnMembers());

        // 신고 처리 탭 - 검색/페이징이 없어 전체 목록을 SSR로 한 번에 내려줌
        model.addAttribute("reportList", adminReportService.getAllReports());

        return "admin/admin";
    }
}
