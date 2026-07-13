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
}
