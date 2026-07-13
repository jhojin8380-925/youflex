package com.youflex.dto;

import java.time.LocalDateTime;

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
    private LocalDateTime reviewReportCreatedAt;
    private String reviewReportContent;
}
