package com.youflex.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.CommentReportDTO;
import com.youflex.dto.QnaCommentReportDTO;
import com.youflex.dto.QnaReportDTO;
import com.youflex.dto.ReportDTO;
import com.youflex.dto.ReviewReportDTO;
import com.youflex.mapper.CommentReportMapper;
import com.youflex.mapper.QnaCommentReportMapper;
import com.youflex.mapper.QnaReportMapper;
import com.youflex.mapper.ReviewReportMapper;

import lombok.RequiredArgsConstructor;

/**
 * 관리자 페이지 - 신고 처리 탭
 * 게시글/댓글/QNA/QNA댓글 신고 4개 테이블을 하나의 목록으로 합쳐서 보여주고,
 * 반려·경고처리 액션을 각 도메인 매퍼로 위임한다.
 */
@Service
@RequiredArgsConstructor
public class AdminReportService {

    private static final String STATUS_DONE = "처리완료";

    private final ReviewReportMapper reviewReportMapper;
    private final CommentReportMapper commentReportMapper;
    private final QnaReportMapper qnaReportMapper;
    private final QnaCommentReportMapper qnaCommentReportMapper;

    // 미처리(접수/처리중) 신고를 위로, 그 안에서는 최신순으로 정렬해서 반환
    public List<ReportDTO> getAllReports() {
        List<ReportDTO> reports = new ArrayList<>();

        for (ReviewReportDTO r : reviewReportMapper.selectReviewReportList()) {
            reports.add(ReportDTO.builder()
                    .reportType("REVIEW")
                    .reportTypeLabel("게시글")
                    .reportId(r.getReviewReportId())
                    .contentSummary(r.getReviewTitle())
                    .reporterName(r.getMemberName())
                    .reportedMemberId(r.getReportedMemberId())
                    .reportedMemberName(r.getReportedMemberName())
                    .reason(r.getReviewReportReason())
                    .status(r.getReviewReportStatus())
                    .createdAt(r.getReviewReportCreatedAt())
                    .detailUrl(null) // 게시글 상세 화면 라우팅이 아직 없어 보류
                    .build());
        }

        for (CommentReportDTO r : commentReportMapper.selectCommentReportList()) {
            reports.add(ReportDTO.builder()
                    .reportType("COMMENT")
                    .reportTypeLabel("댓글")
                    .reportId(r.getCommentReportId())
                    .contentSummary(r.getCommentContent())
                    .reporterName(r.getMemberName())
                    .reportedMemberId(r.getReportedMemberId())
                    .reportedMemberName(r.getReportedMemberName())
                    .reason(r.getCommentReportReason())
                    .status(r.getCommentReportStatus())
                    .createdAt(r.getCommentReportCreatedAt())
                    .detailUrl(null)
                    .build());
        }

        for (QnaReportDTO r : qnaReportMapper.selectQnaReportList()) {
            reports.add(ReportDTO.builder()
                    .reportType("QNA")
                    .reportTypeLabel("QNA")
                    .reportId(r.getQnaReportId())
                    .contentSummary(r.getQnaTitle())
                    .reporterName(r.getMemberName())
                    .reportedMemberId(r.getReportedMemberId())
                    .reportedMemberName(r.getReportedMemberName())
                    .reason(r.getQnaReportReason())
                    .status(r.getQnaReportStatus())
                    .createdAt(r.getQnaReportCreatedAt())
                    .detailUrl("/qna/" + r.getQnaId())
                    .build());
        }

        for (QnaCommentReportDTO r : qnaCommentReportMapper.selectCommentReportList()) {
            reports.add(ReportDTO.builder()
                    .reportType("QNA_COMMENT")
                    .reportTypeLabel("QNA댓글")
                    .reportId(r.getQnaCommentReportId())
                    .contentSummary(r.getQnaCommentContent())
                    .reporterName(r.getMemberName())
                    .reportedMemberId(r.getReportedMemberId())
                    .reportedMemberName(r.getReportedMemberName())
                    .reason(r.getQnaCommentReportReason())
                    .status(r.getQnaCommentReportStatus())
                    .createdAt(r.getQnaCommentReportCreatedAt())
                    .detailUrl("/qna/" + r.getQnaId())
                    .build());
        }

        reports.sort(Comparator
                .comparing((ReportDTO r) -> STATUS_DONE.equals(r.getStatus()))
                .thenComparing(ReportDTO::getCreatedAt, Comparator.reverseOrder()));
        return reports;
    }

    // 신고를 "처리완료"로 전환. 반려(별도 조치 없음)와 경고처리(경고 부여 후 마무리) 양쪽에서 공용으로 호출.
    @Transactional
    public void resolve(String reportType, int reportId) {
        switch (reportType) {
            case "REVIEW" -> reviewReportMapper.updateReviewReportStatus(reportId, STATUS_DONE);
            case "COMMENT" -> commentReportMapper.updateCommentReportStatus(reportId, STATUS_DONE);
            case "QNA" -> qnaReportMapper.updateQnaReportStatus(reportId, STATUS_DONE);
            case "QNA_COMMENT" -> qnaCommentReportMapper.updateCommentReportStatus(reportId, STATUS_DONE);
            default -> throw new IllegalArgumentException("알 수 없는 신고 유형: " + reportType);
        }
    }
}
