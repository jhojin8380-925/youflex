package com.youflex.controller.notice;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.youflex.dto.MemberDTO;
import com.youflex.dto.notice.NoticeDTO;
import com.youflex.service.notice.NoticeService;
import com.youflex.service.qna.QnaService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

/**
 * 공지사항 화면(View) 관련 컨트롤러
 * - REST API가 아닌 서버사이드 렌더링 페이지(JSP/Thymeleaf 등)를 반환
 * - 목록/상세 화면 렌더링만 담당 (등록/수정/삭제는 NoticeController에서 API로 처리)
 */
@Controller
@RequestMapping("/notice")
@RequiredArgsConstructor
public class NoticeViewController {

    private final NoticeService noticeService;
    private final QnaService qnaService;

    // 공지사항 목록 화면
    /**
     * 공지사항 목록 페이지 렌더링
     * @param model 뷰에 전달할 데이터를 담는 모델 객체
     * @return 공지사항 목록 뷰 이름 (notice/notice)
     */
    @GetMapping
    public String noticeList(Model model) {
        List<NoticeDTO> noticeList = noticeService.getNoticeList();
        model.addAttribute("noticeList", noticeList);

        model.addAttribute("qnaList", qnaService.getQnaList()); // 이 줄 추가

        return "notice/notice";
    }

    // 공지사항 상세 화면
    /**
     * 공지사항 상세 페이지 렌더링
     * - 같은 세션에서 이미 조회한 공지사항이면 조회수를 다시 올리지 않음 (F5 새로고침, 댓글/답변
     *   작성 후 location.reload() 등으로 같은 페이지를 재요청해도 최초 1회만 카운트됨)
     * @param noticeId 조회할 공지사항 ID (경로 변수)
     * @param model 뷰에 전달할 데이터를 담는 모델 객체
     * @param session 로그인 세션 (조회 이력 저장용)
     * @return 공지사항 상세 뷰 이름 (notice/notice_detail)
     */
    @GetMapping("/{noticeId}")
    public String noticeDetail(@PathVariable("noticeId") int noticeId, Model model, HttpSession session) {
        boolean increaseHit = isFirstViewInSession(session, noticeId);
        NoticeDTO notice = noticeService.getNoticeDetail(noticeId, increaseHit);
        model.addAttribute("notice", notice); // 상세 데이터를 뷰로 전달
        return "notice/notice_detail";
    }

    // 공지사항 수정 화면
    /**
     * 공지사항 수정 폼 렌더링
     * - memberGrade가 '관리자'가 아니면 상세 페이지로 리다이렉트
     * @param noticeId 수정할 공지사항 ID
     * @param model 뷰에 전달할 데이터를 담는 모델 객체
     * @param session 로그인 세션 (관리자 여부 확인용)
     * @return 공지사항 수정 폼 뷰 이름 (notice/notice_update), 관리자가 아니면 상세 페이지로 리다이렉트
     */
    @GetMapping("/{noticeId}/update")
    public String noticeUpdateForm(@PathVariable("noticeId") int noticeId, Model model, HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember) || !"관리자".equals(loginMember.getMemberGrade())) {
            return "redirect:/notice/" + noticeId;
        }

        // 수정 폼 진입은 실제 조회가 아니므로 조회수를 올리지 않음
        NoticeDTO notice = noticeService.getNoticeDetail(noticeId, false);
        model.addAttribute("notice", notice);
        return "notice/notice_update";
    }

    // 세션에 이 공지사항을 조회한 이력이 있는지 확인하고, 없으면 이력에 추가하면서 true(최초 조회) 반환
    @SuppressWarnings("unchecked")
    private boolean isFirstViewInSession(HttpSession session, int noticeId) {
        Set<Integer> viewedNoticeIds = (Set<Integer>) session.getAttribute("viewedNoticeIds");
        if (viewedNoticeIds == null) {
            viewedNoticeIds = new HashSet<>();
            session.setAttribute("viewedNoticeIds", viewedNoticeIds);
        }
        return viewedNoticeIds.add(noticeId);
    }
}