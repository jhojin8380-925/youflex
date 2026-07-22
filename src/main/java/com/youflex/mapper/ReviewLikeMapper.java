package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.ReviewLikeDTO;

@Mapper
public interface ReviewLikeMapper {

    // 이 회원이 이미 이 게시글에 좋아요를 눌렀는지 확인 (1인 1회 제한 - review_like 유니크 제약과 짝을 이룸)
    int existsLike(@Param("reviewId") int reviewId, @Param("memberId") int memberId);

    // 좋아요 등록
    void insertLike(ReviewLikeDTO reviewLikeDTO);

    // 좋아요 취소
    void deleteLike(@Param("reviewId") int reviewId, @Param("memberId") int memberId);

    // 게시글의 전체 좋아요 수
    int countLikes(@Param("reviewId") int reviewId);

    // 이 회원이 작성한 게시글들이 받은 좋아요 총합 (등업 신청 조건 검증용)
    int countTotalLikesByAuthor(@Param("memberId") int memberId);
}
