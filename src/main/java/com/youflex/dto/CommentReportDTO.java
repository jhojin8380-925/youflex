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
public class CommentReportDTO {
    private int commentReportId;
    private int commentId;
    private int memberId;
    private String commentReportReason;
    private String commentReportStatus;
    private String commentReportCreatedAt;
    private String commentReportContent;
}
