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
public class CommentReportDTO {
    private int commentReportId;
    private int commentId;
    private int memberId;
    private String commentReportReason;
    private String commentReportStatus;
    private LocalDateTime commentReportCreatedAt;
    private String commentReportContent;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
    private String commentContent;
}
