package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.youflex.dto.NoticeDTO;
import com.youflex.mapper.NoticeMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeMapper noticeMapper;

    // 공지사항 목록 조회
    public List<NoticeDTO> getNoticeList() {
        return noticeMapper.selectNoticeList();
    }

    // 공지사항 상세 조회 (조회수 증가 후 조회)
    public NoticeDTO getNoticeDetail(int noticeId) {
        noticeMapper.increaseNoticeHit(noticeId);
        return noticeMapper.selectNoticeById(noticeId);
    }

    // 공지사항 등록
    public void createNotice(NoticeDTO noticeDTO) {
        noticeMapper.insertNotice(noticeDTO);
    }

    // 공지사항 수정
    public void updateNotice(NoticeDTO noticeDTO) {
        noticeMapper.updateNotice(noticeDTO);
    }

    // 공지사항 삭제
    public void deleteNotice(int noticeId) {
        noticeMapper.deleteNotice(noticeId);
    }
}