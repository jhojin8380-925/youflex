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
public class QnaCommentReportDTO {
    private int qnaCommentReportId;
    private int qnaCommentId;
    private int memberId;
    private String commentReportReason;
    private String commentReportStatus;
    private LocalDateTime commentReportCreatedAt;
    private String commentReportContent;
}
