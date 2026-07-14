package com.youflex.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.NoticeDTO;
import com.youflex.service.NoticeService;

/**
 * 공지사항 관련 API 컨트롤러
 * - 공지사항 목록/상세 조회는 전체 사용자 대상
 * - 등록/수정/삭제는 관리자 전용 기능
 */
@RestController
@RequestMapping("/api/notice")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    // 공지사항 목록 조회
    /**
     * 전체 공지사항 목록을 조회
     * @return 공지사항 리스트 (200 OK)
     */
    @GetMapping
    public ResponseEntity<List<NoticeDTO>> getNoticeList() {
        List<NoticeDTO> list = noticeService.getNoticeList();
        return ResponseEntity.ok(list);
    }

    // 공지사항 상세 조회
    /**
     * 특정 공지사항의 상세 정보 조회
     * @param noticeId 조회할 공지사항 ID
     * @return 공지사항 상세 정보 (200 OK)
     */
    @GetMapping("/{noticeId}")
    public ResponseEntity<NoticeDTO> getNoticeDetail(@PathVariable("noticeId") int noticeId) {
        NoticeDTO notice = noticeService.getNoticeDetail(noticeId);
        return ResponseEntity.ok(notice);
    }

    // 공지사항 등록 (관리자 전용)
    /**
     * 새 공지사항 등록
     * @param noticeDTO 등록할 공지사항 정보 (요청 바디)
     * @return 등록 성공 시 201 Created
     */
    @PostMapping
    public ResponseEntity<Void> createNotice(@RequestBody NoticeDTO noticeDTO) {
        // TODO: 관리자 권한 체크 필요 (세션 or Spring Security)
        noticeService.createNotice(noticeDTO);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // 공지사항 수정 (관리자 전용)
    /**
     * 기존 공지사항 수정
     * @param noticeId 수정할 공지사항 ID (경로 변수)
     * @param noticeDTO 수정할 내용을 담은 요청 바디
     * @return 수정 성공 시 200 OK
     */
    @PutMapping("/{noticeId}")
    public ResponseEntity<Void> updateNotice(@PathVariable("noticeId") int noticeId,
                                              @RequestBody NoticeDTO noticeDTO) {
        // TODO: 관리자 권한 체크 필요
        // 경로 변수의 noticeId를 DTO에 강제로 세팅하여 요청 바디의 값과 불일치하는 문제를 방지
        noticeDTO.setNoticeId(noticeId);
        noticeService.updateNotice(noticeDTO);
        return ResponseEntity.ok().build();
    }

    // 공지사항 삭제 (관리자 전용)
    /**
     * 공지사항 삭제
     * @param noticeId 삭제할 공지사항 ID
     * @return 삭제 성공 시 204 No Content
     */
    @DeleteMapping("/{noticeId}")
    public ResponseEntity<Void> deleteNotice(@PathVariable("noticeId") int noticeId) {
        // TODO: 관리자 권한 체크 필요
        noticeService.deleteNotice(noticeId);
        return ResponseEntity.noContent().build();
    }
}