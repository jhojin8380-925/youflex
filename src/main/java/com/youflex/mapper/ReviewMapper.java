package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.GenreCategoryDTO;
import com.youflex.dto.ReviewDTO;

@Mapper
public interface ReviewMapper {
	
	// 게시글 작성(INSERT)
	void write(ReviewDTO reviewDTO);
	
	// 선택한 관심 장르들을 저장
	int insertReviewGenres(@Param("reviewId") int reviewId, @Param("genreCategoryIds") List<Integer> genreCategoryIds);

	// 게시글 상세 조회 (작성자 이름/프로필이미지/등급 join)
	ReviewDTO findById(@Param("reviewId") int reviewId);

	// 게시글 상세 - 선택된 장르 태그 목록 조회
	List<GenreCategoryDTO> findGenresByReviewId(@Param("reviewId") int reviewId);

	// 게시글 상세 조회수 1 증가
	void increaseHit(@Param("reviewId") int reviewId);

	// 마이페이지 - 내 글 탭: 내가 쓴 게시글만 최신순 페이징 조회
	List<ReviewDTO> findByMemberId(@Param("memberId") int memberId,
			@Param("offset") int offset,
			@Param("size") int size);

	// 마이페이지 - 내 글 탭 총 개수(페이지네이션 계산용)
	int countByMemberId(@Param("memberId") int memberId);
	
	// 게시글 수정 - 취향선택, 장르, 플랫폼, 제목, 별점, 본문내용, 관련작품
	void update(ReviewDTO reviewDTO);

	// 게시글 수정 시 장르를 다시 선택하므로, 기존 장르 매핑을 전체 삭제하고 재삽입하기 위한 삭제
	void deleteReviewGenres(@Param("reviewId") int reviewId);

	// 게시글 삭제
	void delete(int reviewId);

	// 좋아요 포인트 지급 마일스톤 갱신 - 이미 지급한 마일스톤(review_rewarded_like_count)보다 클 때만
	// 갱신되는 조건부 UPDATE라서, 영향받은 행 수(1이면 갱신 성공=신규 마일스톤 도달, 0이면 이미 지급됨)로
	// 포인트 지급 여부를 판단한다(좋아요 취소->재좋아요 반복으로 인한 중복 지급 방지).
	int updateRewardedLikeCount(@Param("reviewId") int reviewId, @Param("milestone") int milestone);

	// 마이페이지 포인트 상점 - 게시글 하이라이트 적용. durationDays일간 노출되도록 시작/만료 시각을 설정.
	// (만료 후 자동 해제 배치는 별도 구현 필요 - 지금은 켜는 것까지만 처리)
	void highlightReview(@Param("reviewId") int reviewId, @Param("durationDays") int durationDays);
}
