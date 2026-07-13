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
public class QnaReportDTO {
    private int qnaReportId;
    private int qnaId;
    private int memberId;
    private String reviewReportReason;
    private String reviewReportStatus;
    private String reviewReportCreatedAt;
    private String reviewReportContent;
}
