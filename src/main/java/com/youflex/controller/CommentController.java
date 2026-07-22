package com.youflex.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.CommentDTO;
import com.youflex.dto.CommentReportDTO;
import com.youflex.dto.MemberDTO;
import com.youflex.exception.BadWordDetectedException;
import com.youflex.service.CommentService;
import com.youflex.service.CommentService.LikeResult;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

/**
 * 게시글 댓글(Comment) API 컨트롤러
 * - 댓글/대댓글 CRUD, 좋아요, 신고 기능을 포함 (com.youflex.controller.qna.QnaController와 동일한 구조)
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // 특정 게시글에 달린 댓글/대댓글 목록 조회(로그인 상태면 좋아요 여부도 함께 내려감)
    @GetMapping("/{reviewId}/comments")
    public ResponseEntity<List<CommentDTO>> getComments(@PathVariable("reviewId") int reviewId, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        Integer viewerMemberId = loginMember != null ? loginMember.getMemberId() : null;
        return ResponseEntity.ok(commentService.getComments(reviewId, viewerMemberId));
    }

    // 댓글/대댓글 등록 - parentId를 0보다 크게 보내면 대댓글로 등록됨
    @PostMapping("/{reviewId}/comments")
    public ResponseEntity<?> addComment(@PathVariable("reviewId") int reviewId,
                                            @RequestBody CommentDTO commentDTO, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        commentDTO.setReviewId(reviewId);
        // 클라이언트가 보낸 memberId는 무시하고 세션의 로그인 정보로 강제 세팅(위변조 방지)
        commentDTO.setMemberId(loginMember.getMemberId());
        try {
            commentService.addComment(commentDTO);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (BadWordDetectedException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 댓글 수정 - 작성자 본인 여부는 CommentService에서 검증
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<?> updateComment(@PathVariable("commentId") int commentId,
                                               @RequestBody CommentDTO commentDTO, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            commentService.updateComment(commentId, commentDTO.getCommentContent(), loginMember.getMemberId());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (BadWordDetectedException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 댓글 삭제(소프트 삭제) - 작성자 본인 여부는 CommentService에서 검증
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable("commentId") int commentId, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            commentService.deleteComment(commentId, loginMember.getMemberId());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    // 댓글 좋아요 토글
    @PostMapping("/comments/{commentId}/like")
    public ResponseEntity<?> toggleLike(@PathVariable("commentId") int commentId, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            LikeResult result = commentService.toggleLike(commentId, loginMember.getMemberId());
            return ResponseEntity.ok(Map.of("liked", result.isLiked(), "likeCount", result.getLikeCount()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // 댓글 신고 등록
    @PostMapping("/comments/{commentId}/report")
    public ResponseEntity<Void> reportComment(@PathVariable("commentId") int commentId,
                                               @RequestBody CommentReportDTO reportDTO, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        reportDTO.setCommentId(commentId);
        // 클라이언트가 보낸 memberId는 무시하고 세션의 로그인 정보로 강제 세팅(위변조 방지)
        reportDTO.setMemberId(loginMember.getMemberId());
        commentService.reportComment(reportDTO);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
