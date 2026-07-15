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
public class QnaReportDTO {
    private int qnaReportId;
    private int qnaId;
    private int memberId;
    private String qnaReportReason;
    private String qnaReportStatus;
    private LocalDateTime qnaReportCreatedAt;
    private String qnaReportContent;
    // join 조회용 (DB 컬럼 아님)
    private String memberName;
    private String qnaTitle;

    // 관리자 신고 처리 - 신고 대상(질문글) 작성자 = 경고 부여 대상
    private int reportedMemberId;
    private String reportedMemberName;
}
