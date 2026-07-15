package com.youflex.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewReportDTO {
    private int reviewReportId;
    private int reviewId;
    private int memberId;
    private String reviewReportReason;
    private String reviewReportStatus;
    private LocalDateTime reviewReportCreatedAt;
    private String reviewReportContent;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
    private String reviewTitle;

    // 관리자 신고 처리 - 신고 대상(게시글) 작성자 = 경고 부여 대상
    private int reportedMemberId;
    private String reportedMemberName;
}
