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

    // 관리자 신고 처리 - 신고 대상(질문댓글) 작성자 = 경고 부여 대상, 소속 질문글 ID(이동 링크용)
    private int reportedMemberId;
    private String reportedMemberName;
    private int qnaId;
}
