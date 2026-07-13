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
public class QnaCommentReportDTO {
    private int qnaCommentReportId;
    private int qnaCommentId;
    private int memberId;
    private String qnaCommentReportReason;
    private String qnaCommentReportStatus;
    private LocalDateTime qnaCommentReportCreatedAt;
    private String qnaCommentReportContent;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
    private String qnaCommentContent;
}
