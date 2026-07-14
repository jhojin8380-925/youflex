package com.youflex.controller;

import java.util.List;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.youflex.dto.NoticeDTO;
import com.youflex.service.NoticeService;
import com.youflex.service.QnaService;

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
     * @param noticeId 조회할 공지사항 ID (경로 변수)
     * @param model 뷰에 전달할 데이터를 담는 모델 객체
     * @return 공지사항 상세 뷰 이름 (notice/notice_detail)
     */
    @GetMapping("/{noticeId}")
    public String noticeDetail(@PathVariable("noticeId") int noticeId, Model model) {
        NoticeDTO notice = noticeService.getNoticeDetail(noticeId);
        model.addAttribute("notice", notice); // 상세 데이터를 뷰로 전달
        return "notice/notice_detail";
    }
}