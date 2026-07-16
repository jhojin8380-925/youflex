	package com.youflex.controller.qna;
	
	import org.springframework.stereotype.Controller;
	import org.springframework.ui.Model;
	import org.springframework.web.bind.annotation.GetMapping;
	import org.springframework.web.bind.annotation.PathVariable;
	import org.springframework.web.bind.annotation.RequestMapping;
	import lombok.RequiredArgsConstructor;
	import com.youflex.dto.qna.QnaDTO;
	import com.youflex.dto.admin.AdminAnswerDTO;
	import com.youflex.dto.MemberDTO;
	import com.youflex.service.qna.QnaService;
	import com.youflex.service.qna.QnaCommentService;
	import com.youflex.service.admin.AdminAnswerService;
	import jakarta.servlet.http.HttpSession;
	
	/**
	 * Q&A 화면(View) 관련 컨트롤러
	 * - REST API가 아닌 서버사이드 렌더링 페이지를 반환
	 * - 상세/작성/수정 화면 렌더링을 담당
	 */
	@Controller
	@RequestMapping("/qna")
	@RequiredArgsConstructor
	public class QnaViewController {
	
	    private final QnaService qnaService;
	    private final QnaCommentService qnaCommentService;
	    private final AdminAnswerService adminAnswerService;
	
	    /**
	     * 질문 상세 화면 렌더링
	     * - 질문 내용, 관리자 답변, 댓글 목록을 함께 조회하여 뷰에 전달
	     * - 비밀글인데 작성자 본인도 관리자도 아니면 목록으로 리다이렉트
	     * @param qnaId 조회할 질문 ID
	     * @param model 뷰에 전달할 데이터를 담는 모델 객체
	     * @param session 로그인 세션 (작성자/관리자 여부 확인용)
	     * @return 질문 상세 뷰 이름 (qna/qna_detail), 비공개 글이고 권한이 없으면 목록(/notice)으로 리다이렉트
	     */
	    @GetMapping("/{qnaId}")
	    public String qnaDetail(@PathVariable("qnaId") int qnaId, Model model, HttpSession session) {
	        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
	        Integer requesterMemberId = loginMember != null ? loginMember.getMemberId() : null;
	        boolean isAdmin = loginMember != null && "관리자".equals(loginMember.getMemberGrade());

	        QnaDTO qna;
	        try {
	            qna = qnaService.getQnaDetail(qnaId, requesterMemberId, isAdmin);
	        } catch (IllegalStateException e) {
	            return "redirect:/notice";
	        }

	        AdminAnswerDTO answer = adminAnswerService.getAnswer(qnaId); // 답변 미등록 시 null 반환
	        model.addAttribute("qna", qna);
	        model.addAttribute("answer", answer); // null이면 답변대기 박스로 분기
	        model.addAttribute("comments", qnaCommentService.getComments(qnaId));
	        return "qna/qna_detail";
	    }
	
	    /**
	     * 질문 작성 화면 렌더링
	     * @return 질문 작성 폼 뷰 이름 (qna/qna_write)
	     */
	    @GetMapping("/write")
	    public String qnaWriteForm() {
	        return "qna/qna_write";
	    }
	
	    // TODO: 조회수 증가 없는 순수 조회 메서드로 교체 필요 (지금은 수정 폼 진입만으로 조회수가 올라감)
	    /**
	     * 질문 수정 화면 렌더링
	     * - 현재는 상세 조회와 동일한 서비스 메서드(getQnaDetail)를 사용하고 있어
	     *   수정 폼에 진입하기만 해도 조회수가 함께 올라가는 부작용이 있음 (수정 필요)
	     * @param qnaId 수정할 질문 ID
	     * @param model 뷰에 전달할 데이터를 담는 모델 객체
	     * @return 질문 수정 폼 뷰 이름 (qna/qna_update)
	     */

	    @GetMapping("/{qnaId}/update")
	    public String qnaUpdateForm(@PathVariable("qnaId") int qnaId, Model model, HttpSession session) {

	        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
	        Integer requesterMemberId = loginMember != null ? loginMember.getMemberId() : null;
	        boolean isAdmin = loginMember != null && "관리자".equals(loginMember.getMemberGrade());

	        QnaDTO qna;
	        try {
	            qna = qnaService.getQnaDetail(qnaId, requesterMemberId, isAdmin);
	        } catch (IllegalStateException e) {
	            return "redirect:/notice";
	        }
	        model.addAttribute("qna", qna);
	        return "qna/qna_update";
	    }
	}