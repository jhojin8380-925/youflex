	package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.CommentReportDTO;

@Mapper
public interface CommentReportMapper {

    // 관리자 - 댓글 신고 목록(신고자/작성자/댓글 내용 join)
    List<CommentReportDTO> selectCommentReportList();

    // 관리자 - 신고 처리 상태 변경(반려/경고처리 공용 - '처리완료'로 전환)
    void updateCommentReportStatus(@Param("commentReportId") int commentReportId,
                                    @Param("commentReportStatus") String commentReportStatus);

    // 댓글 신고 등록 (comment_report_status는 DB 기본값 '접수' 사용)
    void insertReport(CommentReportDTO commentReportDTO);
    // 관리자 - 처리완료 탭에서 신고 기록 자체를 완전 삭제(원본 댓글과는 무관)
    void deleteCommentReport(int commentReportId);
}
