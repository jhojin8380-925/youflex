package com.youflex.controller;

import java.util.List;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.NoticeDTO;
import com.youflex.service.NoticeService;

@Controller
@RequestMapping("/notice")
@RequiredArgsConstructor
public class NoticeViewController {

    private final NoticeService noticeService;

    @GetMapping
    public String noticeList(Model model) {
        List<NoticeDTO> noticeList = noticeService.getNoticeList();
        model.addAttribute("noticeList", noticeList);
        return "/notice/notice";
    }

    @GetMapping("/{noticeId}")
    public String noticeDetail(@PathVariable int noticeId, Model model) {
        NoticeDTO notice = noticeService.getNoticeDetail(noticeId);
        model.addAttribute("notice", notice);
        return "/notice/notice_detail";
    }
}