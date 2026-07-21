package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.ReviewReportDTO;

@Mapper
public interface ReviewReportMapper {

    // 관리자 - 게시글 신고 목록(신고자/작성자/게시글 제목 join)
    List<ReviewReportDTO> selectReviewReportList();

    // 관리자 - 신고 처리 상태 변경(반려/경고처리 공용 - '처리완료'로 전환)
    void updateReviewReportStatus(@Param("reviewReportId") int reviewReportId,
                                   @Param("reviewReportStatus") String reviewReportStatus);

    // 게시글 신고 등록 (review_report_status는 DB 기본값 '접수' 사용)
    void insertReport(ReviewReportDTO reviewReportDTO);
    // 관리자 - 처리완료 탭에서 신고 기록 자체를 완전 삭제(원본 게시글과는 무관)
    void deleteReviewReport(int reviewReportId);
}
