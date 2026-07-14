package com.youflex.service;

import java.util.List;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.NoticeDTO;
import com.youflex.mapper.NoticeMapper;
import com.youflex.exception.NoticeNotFoundException;

/**
 * 공지사항(Notice) 관련 비즈니스 로직 구현체
 * - 목록/상세 조회, 등록, 수정, 삭제 처리
 * - 상세 조회 시 조회수 증가, 존재하지 않는 공지사항 접근 시 예외 처리를 담당
 */
@Service
@RequiredArgsConstructor
public class NoticeServiceImpl implements NoticeService {

    private final NoticeMapper noticeMapper;

    /**
     * 전체 공지사항 목록 조회
     * @return 공지사항 리스트
     */
    @Override
    public List<NoticeDTO> getNoticeList() {
        return noticeMapper.selectNoticeList();
    }

    /**
     * 공지사항 상세 조회
     * - 조회 시 조회수를 1 증가시킴 (DB 반영 + 반환 객체에도 반영하여 최신 값 유지)
     * @param noticeId 조회할 공지사항 ID
     * @return 공지사항 상세 정보
     * @throws NoticeNotFoundException 해당 ID의 공지사항이 존재하지 않을 경우
     */
    @Override
    public NoticeDTO getNoticeDetail(int noticeId) {
        NoticeDTO notice = noticeMapper.selectNoticeById(noticeId);
        if (notice == null) {
            throw new NoticeNotFoundException("존재하지 않는 공지사항입니다. noticeId=" + noticeId);
        }
        // 조회수 증가
        noticeMapper.increaseNoticeHit(noticeId); // DB 상의 조회수 증가
        notice.setNoticeHit(notice.getNoticeHit() + 1); // 반환할 객체에도 증가된 조회수 반영 (재조회 없이 최신값 유지)
        return notice;
    }

    /**
     * 공지사항 등록
     * @param noticeDTO 등록할 공지사항 정보
     */
    @Override
    public void createNotice(NoticeDTO noticeDTO) {
        noticeMapper.insertNotice(noticeDTO);
    }

    /**
     * 공지사항 수정
     * - 수정 전 대상 공지사항이 실제로 존재하는지 확인
     * @param noticeDTO 수정할 공지사항 정보 (noticeId 포함)
     * @throws NoticeNotFoundException 해당 ID의 공지사항이 존재하지 않을 경우
     */
    @Override
    public void updateNotice(NoticeDTO noticeDTO) {
        NoticeDTO existing = noticeMapper.selectNoticeById(noticeDTO.getNoticeId());
        if (existing == null) {
            throw new NoticeNotFoundException("존재하지 않는 공지사항입니다. noticeId=" + noticeDTO.getNoticeId());
        }
        noticeMapper.updateNotice(noticeDTO);
    }

    /**
     * 공지사항 삭제
     * - 삭제 전 대상 공지사항이 실제로 존재하는지 확인
     * @param noticeId 삭제할 공지사항 ID
     * @throws NoticeNotFoundException 해당 ID의 공지사항이 존재하지 않을 경우
     */
    @Override
    public void deleteNotice(int noticeId) {
        NoticeDTO existing = noticeMapper.selectNoticeById(noticeId);
        if (existing == null) {
            throw new NoticeNotFoundException("존재하지 않는 공지사항입니다. noticeId=" + noticeId);
        }
        noticeMapper.deleteNotice(noticeId);
    }
}