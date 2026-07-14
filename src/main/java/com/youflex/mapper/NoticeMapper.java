package com.youflex.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.youflex.dto.NoticeDTO;

@Mapper
public interface NoticeMapper {

    // 공지사항 목록 조회 (최신순)
    List<NoticeDTO> selectNoticeList();

    // 공지사항 상세 조회
    NoticeDTO selectNoticeById(int noticeId);

    // 조회수 +1
    void increaseNoticeHit(int noticeId);

    // 공지사항 등록
    void insertNotice(NoticeDTO noticeDTO);

    // 공지사항 수정
    void updateNotice(NoticeDTO noticeDTO);

    // 공지사항 삭제
    void deleteNotice(int noticeId);
}