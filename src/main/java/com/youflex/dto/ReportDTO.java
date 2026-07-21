package com.youflex.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// 게시글/댓글/QNA/QNA댓글 4종 신고를 관리자 화면에서 한 목록으로 보여주기 위한 통합 뷰 DTO.
// DB 테이블과 1:1 대응되지 않고 AdminReportService가 4개 도메인 DTO를 변환해서 채운다.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportDTO {
    private String reportType;       // REVIEW | COMMENT | QNA | QNA_COMMENT (API 경로/액션 구분용)
    private String reportTypeLabel;  // 게시글 | 댓글 | QNA | QNA댓글 (화면 표시용)
    private int reportId;            // 신고 원본 PK (review_report_id 등)
    private int targetId;            // 신고 대상 원본 콘텐츠 PK (review_id/comment_id/qna_id/qna_comment_id) - "삭제" 액션용
    private String contentSummary;   // 신고 대상 콘텐츠 제목/본문
    private String reporterName;     // 신고자 이름
    private int reportedMemberId;    // 신고 대상 콘텐츠 작성자 memberId (경고 부여 대상)
    private String reportedMemberName;
    private String reason;
    private String status;
    private LocalDateTime createdAt;
    private String detailUrl;        // "게시글 이동" 링크. 이동할 화면이 없으면 null
    private long elapsedDays;        // 신고 접수일로부터 경과일 - 처리완료 탭 표시용
}
