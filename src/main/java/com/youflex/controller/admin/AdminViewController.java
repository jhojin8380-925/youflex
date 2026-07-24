package com.youflex.controller.admin;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.youflex.dto.MemberDTO;
import com.youflex.dto.ReportDTO;
import com.youflex.dto.qna.QnaDTO;
import com.youflex.service.BadWordService;
import com.youflex.service.BannerService;
import com.youflex.service.admin.AdminReportService;
import com.youflex.service.admin.AdminStatsService;
import com.youflex.service.MemberService;
import com.youflex.service.qna.QnaService;

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

        // Q&A 답변완료 탭 - 답변 등록일(admin_answer_created_at) 기준 이 일수가 지나면 탭 목록에서 숨김(원본 데이터는 유지)
        private static final long QNA_ANSWERED_VISIBLE_DAYS = 7;

        private final MemberService memberService;
        private final AdminReportService adminReportService;
        private final QnaService qnaService;
        private final AdminStatsService adminStatsService;
        private final BannerService bannerService;
        private final BadWordService badWordService;

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
                List<MemberDTO> withdrawnMembers = memberService.getWithdrawnMembers();
                model.addAttribute("withdrawnMembers", withdrawnMembers);

                // 신고 처리 탭 - 미처리/처리완료 서브탭으로 분리. 검색/페이징이 없어 전체를 SSR로 한 번에 내려줌
                List<ReportDTO> allReports = adminReportService.getAllReports();
                List<ReportDTO> pendingReports = allReports.stream()
                                .filter(r -> !"처리완료".equals(r.getStatus())).toList();
                List<ReportDTO> resolvedReports = allReports.stream()
                                .filter(r -> "처리완료".equals(r.getStatus())).toList();
                model.addAttribute("reportList", pendingReports);
                model.addAttribute("resolvedReportList", resolvedReports);

                // Q&A 답변 탭 - 답변대기/답변완료 서브탭으로 분리. 검색/페이징이 없어 전체를 SSR로 한 번에 내려줌
                // 답변완료는 admin_answer_created_at 기준 QNA_ANSWERED_VISIBLE_DAYS(7일)가 지나면 목록에서 제외
                // (qna_status/답변/원본 게시글은 그대로 유지되고, 이 탭 화면에서만 안 보이는 것)
                List<QnaDTO> allQna = qnaService.getQnaList();
                LocalDateTime now = LocalDateTime.now();
                List<QnaDTO> qnaWaitingList = allQna.stream()
                                .filter(q -> !"답변완료".equals(q.getQnaStatus())).toList();
                List<QnaDTO> qnaAnsweredList = allQna.stream()
                                .filter(q -> "답변완료".equals(q.getQnaStatus())
                                                && q.getAdminAnswerCreatedAt() != null
                                                && ChronoUnit.DAYS.between(q.getAdminAnswerCreatedAt(), now) < QNA_ANSWERED_VISIBLE_DAYS)
                                .peek(q -> q.setElapsedAnswerDays(ChronoUnit.DAYS.between(q.getAdminAnswerCreatedAt(), now)))
                                .toList();
                model.addAttribute("qnaWaitingList", qnaWaitingList);
                model.addAttribute("qnaAnsweredList", qnaAnsweredList);

                // 배너 설정 탭
                model.addAttribute("bannerList", bannerService.getBannerList());

                // 금칙어 관리 탭
                model.addAttribute("badWordList", badWordService.getBadWordList());

                // 상단 KPI 카드 - 오늘/이번주 가입자 수, 탈퇴 신청자 수, 누적 탈퇴자수, 신고 접수(미처리)
                model.addAttribute("todayJoinCount", adminStatsService.getTodayJoinCount());
                model.addAttribute("weekJoinCount", adminStatsService.getThisWeekJoinCount());
                model.addAttribute("pendingWithdrawCount", withdrawnMembers.size());
                model.addAttribute("totalWithdrawnCount", adminStatsService.getTotalWithdrawnCount());
                model.addAttribute("pendingReportCount", pendingReports.size());

                return "admin/admin";
        }
}
