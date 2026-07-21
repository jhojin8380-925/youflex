package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.CommentDTO;

@Mapper
public interface CommentMapper {

    // 관리자 신고 처리 - 삭제 액션. 대댓글 보존을 위해 하드 삭제가 아닌 소프트 삭제(comment_delete_status = '삭제')
    void deleteComment(int commentId);

    // 게시글 상세 - 댓글/대댓글 전체 조회(작성자 이름, 좋아요 수, 이 회원의 좋아요 여부까지 함께 join)
    List<CommentDTO> findByReviewId(@Param("reviewId") int reviewId, @Param("memberId") Integer memberId);

    // 댓글 단건 조회 - 수정/삭제/좋아요 권한 검증 및 작성자 확인용
    CommentDTO findById(@Param("commentId") int commentId);

    // 댓글/대댓글 등록
    void insertComment(CommentDTO commentDTO);

    // 댓글/대댓글 수정 (본인 확인은 CommentService에서)
    void updateComment(CommentDTO commentDTO);
}
