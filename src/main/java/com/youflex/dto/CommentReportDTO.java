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

    // 관리자 신고 처리 - 신고 대상(댓글) 작성자 = 경고 부여 대상
    private int reportedMemberId;
    private String reportedMemberName;
}
