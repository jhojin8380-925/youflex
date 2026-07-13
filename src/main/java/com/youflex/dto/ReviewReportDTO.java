package com.youflex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewReportDTO {
    private int reviewReportId;
    private int reviewId;
    private int memberId;
    private String reviewReportReason;
    private String reviewReportStatus;
    private String reviewReportCreatedAt;
    private String reviewReportContent;
}
