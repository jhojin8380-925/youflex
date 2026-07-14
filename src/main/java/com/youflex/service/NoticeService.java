package com.youflex.service;

import java.util.List;
import com.youflex.dto.NoticeDTO;

public interface NoticeService {

    // 공지사항 목록 조회
    List<NoticeDTO> getNoticeList();

    // 공지사항 상세 조회 (조회수 증가 포함)
    NoticeDTO getNoticeDetail(int noticeId);

    // 공지사항 등록
    void createNotice(NoticeDTO noticeDTO);

    // 공지사항 수정
    void updateNotice(NoticeDTO noticeDTO);

    // 공지사항 삭제
    void deleteNotice(int noticeId);
}
