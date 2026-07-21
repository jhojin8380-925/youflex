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
	
	// 전체 게시글 목록 조회
	// 검색 + 페이징 게시글 목록 조회
	// -@Param : 파라미터가 여러 개이므로 XML에서 이름으로 구별하기 위해 붙임
	// -keyword : 검색어(없으면 빈 문자열 "")
	// -offset : 건너뛸 게시글 수(PageInfo가 계산해서 넘겨줌)
	// - size : 가져올 게시글 수(페이지
	List<ReviewDTO> findAll(@Param("keyword") String keyword,
							@Param("offset") int offset,
							@Param("size") int size);
	
	// 검색 결과 전체 개수 조회 : 총 페이지 수 계산(PageInfo 생성자)에 사용
	int countAll(@Param("keyword") String keyword);
	
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
	
	// 게시글 삭제
	void delete(int reviewId);
}
