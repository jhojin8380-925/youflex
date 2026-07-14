package com.youflex.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.NoticeDTO;
import com.youflex.service.NoticeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notice")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    // 공지사항 목록 조회
    @GetMapping
    public ResponseEntity<List<NoticeDTO>> getNoticeList() {
        List<NoticeDTO> list = noticeService.getNoticeList();
        return ResponseEntity.ok(list);
    }

    // 공지사항 상세 조회
    @GetMapping("/{noticeId}")
    public ResponseEntity<NoticeDTO> getNoticeDetail(@PathVariable("noticeId") int noticeId) {
        NoticeDTO notice = noticeService.getNoticeDetail(noticeId);
        return ResponseEntity.ok(notice);
    }

    // 공지사항 등록 (관리자 전용)
    @PostMapping
    public ResponseEntity<Void> createNotice(@RequestBody NoticeDTO noticeDTO) {
        // TODO: 관리자 권한 체크 필요 (세션 or @PreAuthorize)
        noticeService.createNotice(noticeDTO);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // 공지사항 수정 (관리자 전용)
    @PutMapping("/{noticeId}")
    public ResponseEntity<Void> updateNotice(@PathVariable("noticeId") int noticeId,
                                              @RequestBody NoticeDTO noticeDTO) {
        // TODO: 관리자 권한 체크 필요
        noticeDTO.setNoticeId(noticeId);
        noticeService.updateNotice(noticeDTO);
        return ResponseEntity.ok().build();
    }

    // 공지사항 삭제 (관리자 전용)
    @DeleteMapping("/{noticeId}")
    public ResponseEntity<Void> deleteNotice(@PathVariable("noticeId") int noticeId) {
        // TODO: 관리자 권한 체크 필요
        noticeService.deleteNotice(noticeId);
        return ResponseEntity.noContent().build();
    }
}