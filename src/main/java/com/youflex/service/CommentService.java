package com.youflex.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.CommentDTO;
import com.youflex.dto.CommentLikeDTO;
import com.youflex.dto.CommentReportDTO;
import com.youflex.dto.ReviewDTO;
import com.youflex.mapper.CommentLikeMapper;
import com.youflex.mapper.CommentMapper;
import com.youflex.mapper.CommentReportMapper;
import com.youflex.mapper.ReviewMapper;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;

/**
 * 게시글 댓글(Comment) 관련 비즈니스 로직
 * - 댓글/대댓글 조회(베스트 댓글 선정 포함), 등록, 수정, 삭제, 좋아요, 신고 처리
 * - 수정/삭제/좋아요는 작성자 본인 확인이 필요한 경우 여기서 검증
 */
@Service
@RequiredArgsConstructor
public class CommentService {

    private static final int BEST_COMMENT_LIMIT = 3;

    private final CommentMapper commentMapper;
    private final CommentLikeMapper commentLikeMapper;
    private final CommentReportMapper commentReportMapper;
    private final ReviewMapper reviewMapper;
    private final PointService pointService;
    private final BadWordService badWordService;
    private final NotificationsService notificationsService;

    /**
     * 특정 게시글의 댓글/대댓글 목록 조회
     * - 대댓글(parentId != 0)은 부모 댓글의 replies에 묶어서 반환하며, 대댓글에 달린 답글(대대댓글)도
     *   같은 방식으로 재귀적으로 연결되어 트리 구조로 내려감(깊이 제한 없음)
     * - 좋아요 1개 이상인 최상위 댓글 중 상위 3개를 베스트 댓글로 표시(동점이면 먼저 작성된 순)
     * @param reviewId 게시글 ID
     * @param viewerMemberId 조회하는 회원 ID(비로그인이면 null - likedByMe는 항상 false로 내려감)
     * @return 최상위 댓글 리스트(각 댓글에 replies가 트리 형태로 채워진 상태)
     */
    public List<CommentDTO> getComments(int reviewId, Integer viewerMemberId) {
        List<CommentDTO> all = commentMapper.findByReviewId(reviewId, viewerMemberId);

        List<CommentDTO> topLevel = new ArrayList<>();
        Map<Integer, List<CommentDTO>> repliesByParent = new LinkedHashMap<>();
        for (CommentDTO c : all) {
            if (c.getParentId() == 0) {
                topLevel.add(c);
            } else {
                repliesByParent.computeIfAbsent(c.getParentId(), k -> new ArrayList<>()).add(c);
            }
        }
        // 최상위 댓글뿐 아니라 모든 댓글(대댓글 포함)에 자신의 하위 답글을 연결해야
        // 대댓글의 대댓글(대대댓글)까지 트리로 이어짐
        for (CommentDTO c : all) {
            c.setReplies(repliesByParent.getOrDefault(c.getCommentId(), List.of()));
        }

        topLevel.stream()
                .filter(c -> c.getLikeCount() > 0)
                .sorted(Comparator.comparingInt(CommentDTO::getLikeCount).reversed())
                .limit(BEST_COMMENT_LIMIT)
                .forEach(c -> c.setBest(true));

        return topLevel;
    }

    /**
     * 댓글/대댓글 등록
     * @param commentDTO 등록할 댓글 정보(reviewId, memberId, parentId, commentContent 포함)
     */
    public void addComment(CommentDTO commentDTO) {
        // 금칙어가 포함되어 있으면 등록 자체를 막음
        badWordService.validateContent(commentDTO.getCommentContent());
        commentMapper.insertComment(commentDTO);

        // 헤더 🔔 알림 패널에 "내 글 댓글 알림" 표시 (자기 글에 자기가 단 댓글은 알림 제외)
        ReviewDTO review = reviewMapper.findById(commentDTO.getReviewId());
        if (review != null && review.getMemberId() != commentDTO.getMemberId()) {
            String content = commentDTO.getCommentContent();
            String preview = content.length() > 30 ? content.substring(0, 30) + "..." : content;
            notificationsService.notify(review.getMemberId(), "댓글",
                    "\"" + review.getReviewTitle() + "\"에 댓글이 달렸습니다: " + preview, "review");
        }
    }

    /**
     * 댓글 수정
     * - 댓글 존재 여부 확인 후, 요청자가 작성자 본인인지 검증
     * @throws IllegalArgumentException 댓글이 존재하지 않을 경우
     * @throws IllegalStateException 요청자가 작성자 본인이 아니거나, 이미 삭제된 댓글일 경우
     */
    public void updateComment(int commentId, String newContent, int requesterMemberId) {
        CommentDTO comment = commentMapper.findById(commentId);
        if (comment == null) {
            throw new IllegalArgumentException("존재하지 않는 댓글입니다.");
        }
        if (comment.getMemberId() != requesterMemberId) {
            throw new IllegalStateException("수정 권한이 없습니다.");
        }
        if ("삭제".equals(comment.getCommentDeleteStatus())) {
            throw new IllegalStateException("삭제된 댓글은 수정할 수 없습니다.");
        }
        // 금칙어가 포함되어 있으면 수정도 막음 (필터 우회 방지)
        badWordService.validateContent(newContent);
        comment.setCommentContent(newContent);
        commentMapper.updateComment(comment);
    }

    /**
     * 댓글 삭제 (소프트 삭제 - 대댓글 보존을 위해 comment_delete_status만 변경)
     * - 댓글 존재 여부 확인 후, 요청자가 작성자 본인인지 검증
     * @throws IllegalArgumentException 댓글이 존재하지 않을 경우
     * @throws IllegalStateException 요청자가 작성자 본인이 아닐 경우
     */
    public void deleteComment(int commentId, int requesterMemberId) {
        CommentDTO comment = commentMapper.findById(commentId);
        if (comment == null) {
            throw new IllegalArgumentException("존재하지 않는 댓글입니다.");
        }
        if (comment.getMemberId() != requesterMemberId) {
            throw new IllegalStateException("삭제 권한이 없습니다.");
        }
        commentMapper.deleteComment(commentId);
    }

    /**
     * 댓글 좋아요 토글 - 이미 눌렀으면 취소, 아니면 등록. 등록 시에만(자추 제외) 작성자에게 포인트 1점 지급.
     * (project-plan.md: "좋아요 - 토글 방식, 1인 1회 제한", "(게시글, 댓글) 좋아요 클릭 & 받을 시: 1pt")
     * @throws IllegalArgumentException 댓글이 존재하지 않을 경우
     */
    @Transactional
    public LikeResult toggleLike(int commentId, int memberId) {
        CommentDTO comment = commentMapper.findById(commentId);
        if (comment == null) {
            throw new IllegalArgumentException("존재하지 않는 댓글입니다.");
        }
        boolean alreadyLiked = commentLikeMapper.existsLike(commentId, memberId) > 0;
        if (alreadyLiked) {
            commentLikeMapper.deleteLike(commentId, memberId);
        } else {
            commentLikeMapper.insertLike(CommentLikeDTO.builder().commentId(commentId).memberId(memberId).build());
            if (comment.getMemberId() != memberId) {
                pointService.awardPoints(comment.getMemberId(), 1, "댓글 좋아요");
            }
        }
        int likeCount = commentLikeMapper.countLikes(commentId);
        return new LikeResult(!alreadyLiked, likeCount);
    }

    /**
     * 댓글 신고 등록 (처리 상태는 DB 기본값 '접수', 실제 처리는 관리자 신고 관리 화면(AdminReportService)에서 진행)
     */
    public void reportComment(CommentReportDTO reportDTO) {
        commentReportMapper.insertReport(reportDTO);
    }

    @Data
    @AllArgsConstructor
    public static class LikeResult {
        private boolean liked;
        private int likeCount;
    }
}
