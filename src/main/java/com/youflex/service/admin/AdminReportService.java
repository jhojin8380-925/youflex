package com.youflex.service.admin;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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
import com.youflex.mapper.CommentMapper;
import com.youflex.mapper.CommentReportMapper;
import com.youflex.mapper.QnaCommentReportMapper;
import com.youflex.mapper.QnaReportMapper;
import com.youflex.mapper.ReviewMapper;
import com.youflex.mapper.ReviewReportMapper;
import com.youflex.mapper.qna.QnaCommentMapper;
import com.youflex.mapper.qna.QnaMapper;
import com.youflex.service.NotificationsService;

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

    // "삭제" 액션 - 신고된 원본 콘텐츠 자체를 지우기 위해, 소유권 체크가 있는 도메인 서비스를 거치지 않고
    // 위의 *ReportMapper들과 동일하게 raw mapper를 직접 사용한다.
    private final ReviewMapper reviewMapper;
    private final CommentMapper commentMapper;
    private final QnaMapper qnaMapper;
    private final QnaCommentMapper qnaCommentMapper;

    // 신고 처리 완료 시 헤더 🔔 알림으로 신고자에게 통보하기 위해 사용
    private final NotificationsService notificationsService;

    // 미처리(접수/처리중) 신고를 위로, 그 안에서는 최신순으로 정렬해서 반환
    public List<ReportDTO> getAllReports() {
        List<ReportDTO> reports = new ArrayList<>();

        for (ReviewReportDTO r : reviewReportMapper.selectReviewReportList()) {
            reports.add(ReportDTO.builder()
                    .reportType("REVIEW")
                    .reportTypeLabel("게시글")
                    .reportId(r.getReviewReportId())
                    .targetId(r.getReviewId())
                    .contentSummary(r.getReviewReportContent())
                    .reporterName(r.getMemberName())
                    .reportedMemberId(r.getReportedMemberId())
                    .reportedMemberName(r.getReportedMemberName())
                    .reason(r.getReviewReportReason())
                    .status(r.getReviewReportStatus())
                    .createdAt(r.getReviewReportCreatedAt())
                    .elapsedDays(ChronoUnit.DAYS.between(r.getReviewReportCreatedAt(), LocalDateTime.now()))
                    .detailUrl("/review/" + r.getReviewId())
                    .build());
        }

        for (CommentReportDTO r : commentReportMapper.selectCommentReportList()) {
            reports.add(ReportDTO.builder()
                    .reportType("COMMENT")
                    .reportTypeLabel("댓글")
                    .reportId(r.getCommentReportId())
                    .targetId(r.getCommentId())
                    .contentSummary(r.getCommentReportContent())
                    .reporterName(r.getMemberName())
                    .reportedMemberId(r.getReportedMemberId())
                    .reportedMemberName(r.getReportedMemberName())
                    .reason(r.getCommentReportReason())
                    .status(r.getCommentReportStatus())
                    .createdAt(r.getCommentReportCreatedAt())
                    .elapsedDays(ChronoUnit.DAYS.between(r.getCommentReportCreatedAt(), LocalDateTime.now()))
                    .detailUrl(null)
                    .build());
        }

        for (QnaReportDTO r : qnaReportMapper.selectQnaReportList()) {
            reports.add(ReportDTO.builder()
                    .reportType("QNA")
                    .reportTypeLabel("QNA")
                    .reportId(r.getQnaReportId())
                    .targetId(r.getQnaId())
                    .contentSummary(r.getQnaReportContent())
                    .reporterName(r.getMemberName())
                    .reportedMemberId(r.getReportedMemberId())
                    .reportedMemberName(r.getReportedMemberName())
                    .reason(r.getQnaReportReason())
                    .status(r.getQnaReportStatus())
                    .createdAt(r.getQnaReportCreatedAt())
                    .elapsedDays(ChronoUnit.DAYS.between(r.getQnaReportCreatedAt(), LocalDateTime.now()))
                    // "삭제" 처리로 원본이 지워지면 qna_id가 SET NULL(-> int라 0)이 되므로, 이 경우 링크를 만들지 않음
                    .detailUrl(r.getQnaId() > 0 ? "/qna/" + r.getQnaId() : null)
                    .build());
        }

        for (QnaCommentReportDTO r : qnaCommentReportMapper.selectCommentReportList()) {
            reports.add(ReportDTO.builder()
                    .reportType("QNA_COMMENT")
                    .reportTypeLabel("QNA댓글")
                    .reportId(r.getQnaCommentReportId())
                    .targetId(r.getQnaCommentId())
                    .contentSummary(r.getQnaCommentReportContent())
                    .reporterName(r.getMemberName())
                    .reportedMemberId(r.getReportedMemberId())
                    .reportedMemberName(r.getReportedMemberName())
                    .reason(r.getQnaCommentReportReason())
                    .status(r.getQnaCommentReportStatus())
                    .createdAt(r.getQnaCommentReportCreatedAt())
                    .elapsedDays(ChronoUnit.DAYS.between(r.getQnaCommentReportCreatedAt(), LocalDateTime.now()))
                    // "삭제" 처리로 원본 댓글이 지워지면 qna_comment_id가 SET NULL되어 join으로 얻던 qna_id도 0이 됨
                    .detailUrl(r.getQnaId() > 0 ? "/qna/" + r.getQnaId() : null)
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
        notifyReporterOfResolution(reportType, reportId, "검토 결과 별도 조치 없이 처리 완료되었습니다.");
    }

    // 신고를 "삭제" 처리 - 신고된 원본 콘텐츠 자체를 지우고, 신고 상태도 "처리완료"로 전환.
    // REVIEW/QNA/QNA_COMMENT는 하드 삭제(기존 도메인 삭제 메서드 재사용), COMMENT는 스키마상 소프트 삭제.
    @Transactional
    public void deleteReportedContent(String reportType, int reportId, int targetId) {
        switch (reportType) {
            case "REVIEW" -> {
                reviewMapper.delete(targetId);
                reviewReportMapper.updateReviewReportStatus(reportId, STATUS_DONE);
            }
            case "COMMENT" -> {
                commentMapper.deleteComment(targetId);
                commentReportMapper.updateCommentReportStatus(reportId, STATUS_DONE);
            }
            case "QNA" -> {
                qnaMapper.deleteQna(targetId);
                qnaReportMapper.updateQnaReportStatus(reportId, STATUS_DONE);
            }
            case "QNA_COMMENT" -> {
                qnaCommentMapper.deleteComment(targetId);
                qnaCommentReportMapper.updateCommentReportStatus(reportId, STATUS_DONE);
            }
            default -> throw new IllegalArgumentException("알 수 없는 신고 유형: " + reportType);
        }
        notifyReporterOfResolution(reportType, reportId, "신고하신 내용이 확인되어 해당 콘텐츠가 삭제 처리되었습니다.");
    }

    /**
     * 신고 처리 완료 시 신고자에게 헤더 🔔 알림 발송 (project-plan.md 3-6 알림 시스템 - 신고 처리 결과 통보).
     * 신고 테이블에 대한 별도 "id로 단건 조회" 매퍼가 없어, 기존 목록 조회 결과에서 방금 처리한 건을 찾아 재사용한다.
     * (원본 콘텐츠가 삭제되어도 신고 테이블의 FK는 ON DELETE SET NULL이라 신고 행 자체와 memberId는 남아있음)
     */
    private void notifyReporterOfResolution(String reportType, int reportId, String resultText) {
        switch (reportType) {
            case "REVIEW" -> reviewReportMapper.selectReviewReportList().stream()
                    .filter(r -> r.getReviewReportId() == reportId)
                    .findFirst()
                    .ifPresent(r -> notificationsService.notify(r.getMemberId(), "신고처리완료",
                            "신고하신 게시글 신고가 " + resultText, "report"));
            case "COMMENT" -> commentReportMapper.selectCommentReportList().stream()
                    .filter(r -> r.getCommentReportId() == reportId)
                    .findFirst()
                    .ifPresent(r -> notificationsService.notify(r.getMemberId(), "신고처리완료",
                            "신고하신 댓글 신고가 " + resultText, "report"));
            case "QNA" -> qnaReportMapper.selectQnaReportList().stream()
                    .filter(r -> r.getQnaReportId() == reportId)
                    .findFirst()
                    .ifPresent(r -> notificationsService.notify(r.getMemberId(), "신고처리완료",
                            "신고하신 QNA 신고가 " + resultText, "report"));
            case "QNA_COMMENT" -> qnaCommentReportMapper.selectCommentReportList().stream()
                    .filter(r -> r.getQnaCommentReportId() == reportId)
                    .findFirst()
                    .ifPresent(r -> notificationsService.notify(r.getMemberId(), "신고처리완료",
                            "신고하신 QNA 댓글 신고가 " + resultText, "report"));
            default -> throw new IllegalArgumentException("알 수 없는 신고 유형: " + reportType);
        }
    }

    // 처리완료 탭 - 이미 반려/삭제 처리가 끝난 신고 기록 자체를 목록에서 완전 삭제(원본 콘텐츠는 건드리지 않음)
    @Transactional
    public void purgeResolvedReport(String reportType, int reportId) {
        switch (reportType) {
            case "REVIEW" -> reviewReportMapper.deleteReviewReport(reportId);
            case "COMMENT" -> commentReportMapper.deleteCommentReport(reportId);
            case "QNA" -> qnaReportMapper.deleteQnaReport(reportId);
            case "QNA_COMMENT" -> qnaCommentReportMapper.deleteQnaCommentReport(reportId);
            default -> throw new IllegalArgumentException("알 수 없는 신고 유형: " + reportType);
        }
    }
}
