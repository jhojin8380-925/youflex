package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.PageInfo;
import com.youflex.dto.ReviewDTO;
import com.youflex.mapper.CommentMapper;
import com.youflex.mapper.ReviewDraftMapper;
import com.youflex.mapper.ReviewLikeMapper;
import com.youflex.mapper.ReviewMapper;
import com.youflex.mapper.ReviewReportMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewService {

	private static final int MY_REVIEWS_PAGE_SIZE = 5;

	private final ReviewMapper reviewMapper;
	private final CommentMapper commentMapper;
	// 좋아요, 북마크, 신고, 게시글 입시저장
	private final ReviewLikeMapper reviewLikeMapper;
	private final ReviewReportMapper reviewReportMapper;
	private final ReviewDraftMapper reviewDraftMapper;
	
//	1) 게시글 저장
	@Transactional
	public void write(ReviewDTO reviewDTO, List<Integer> genreCategoryIds) {
		// 1. 게시글 데이터 저장
		reviewMapper.write(reviewDTO);
		
		// 2. 장르를 선택했을 경우에만 매핑 테이블에 일괄 저장 진행
		if(genreCategoryIds != null && !genreCategoryIds.isEmpty()) {
			int generatedReviewId = reviewDTO.getReviewId();
			reviewMapper.insertReviewGenres(generatedReviewId, genreCategoryIds);
		}
	}
	
//	2) 전체 게시글 목록 조회
	public List<ReviewDTO> findAll(String keywor, int offset, int size){
		return reviewMapper.findAll(keywor, offset, size);
	}
	
//	+) 검색 결과 전체 개수 조회
	public int countAll(String keyword) {
		return reviewMapper.countAll(keyword);
	}
	
//	3) 게시글 상세 조회
	public ReviewDTO findById(int postId) {
		return reviewMapper.findById(postId);
	}
	
//	4) 게시글 수정
	public void update(ReviewDTO reviewDTO) {
		reviewMapper.update(reviewDTO);
	}

//	5) 게시글 삭제

//	마이페이지 - 내 글 탭(5개씩 페이징). page는 1부터 시작.
	public List<ReviewDTO> getMyReviews(int memberId, int page) {
		int offset = PageInfo.of(page, MY_REVIEWS_PAGE_SIZE, 0).getOffset();
		return reviewMapper.findByMemberId(memberId, offset, MY_REVIEWS_PAGE_SIZE);
	}

	public int getMyReviewsTotalCount(int memberId) {
		return reviewMapper.countByMemberId(memberId);
	}

	public int getMyReviewsPageSize() {
		return MY_REVIEWS_PAGE_SIZE;
	}
}