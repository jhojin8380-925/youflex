package com.youflex.controller.admin;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.youflex.dto.MemberDTO;
import com.youflex.dto.qna.QnaDTO;
import com.youflex.service.admin.AdminAnswerService;
import com.youflex.service.qna.QnaService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

/**
 * 관리자 Q&A 답변 화면(View) 관련 컨트롤러
 * - REST API가 아닌 서버사이드 렌더링 페이지를 반환
 * - 질문 상세 + 답변 작성/수정 화면 렌더링만 담당 (저장은 AdminAnswerController API로 처리)
 */
@Controller
@RequestMapping("/admin/qna")
@RequiredArgsConstructor
public class AdminQnaViewController {

    private final QnaService qnaService;
    private final AdminAnswerService adminAnswerService;

    /**
     * 질문 상세 + 답변 작성/수정 화면 렌더링
     * - memberGrade가 '관리자'가 아니면 메인으로 리다이렉트
     * @param qnaId 조회할 질문 ID
     * @param model 뷰에 전달할 데이터를 담는 모델 객체
     * @param session 로그인 세션 (관리자 여부 확인용)
     * @return 관리자 Q&A 상세 뷰 이름 (admin/qna_detail), 관리자가 아니면 메인으로 리다이렉트
     */
    @GetMapping("/{qnaId}")
    public String qnaDetail(@PathVariable("qnaId") int qnaId, Model model, HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember) || !"관리자".equals(loginMember.getMemberGrade())) {
            return "redirect:/";
        }

        QnaDTO qna = qnaService.getQnaDetail(qnaId, loginMember.getMemberId(), true);
        model.addAttribute("qna", qna);
        model.addAttribute("answer", adminAnswerService.getAnswer(qnaId)); // 답변 미등록 시 null 반환
        return "admin/qna_detail";
    }
}
