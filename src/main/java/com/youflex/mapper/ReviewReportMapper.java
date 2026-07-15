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
}
