package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.CommentLikeDTO;

@Mapper
public interface CommentLikeMapper {

    // 이 회원이 이미 이 댓글에 좋아요를 눌렀는지 확인 (1인 1회 제한 - comment_like 유니크 제약과 짝을 이룸)
    int existsLike(@Param("commentId") int commentId, @Param("memberId") int memberId);

    // 좋아요 등록
    void insertLike(CommentLikeDTO commentLikeDTO);

    // 좋아요 취소
    void deleteLike(@Param("commentId") int commentId, @Param("memberId") int memberId);

    // 댓글의 전체 좋아요 수
    int countLikes(@Param("commentId") int commentId);
}
