package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.youflex.dto.GenreCategoryDTO;
import com.youflex.dto.ReviewDTO;
import com.youflex.dto.ReviewListSearchDTO;
import com.youflex.mapper.ReviewListMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewListService {

	private static final int PAGE_SIZE = 10;
	private static final int POPULAR_LIST_SIZE = 5; // 메인 화면 인기 리뷰글 - 플랫폼별 top5

	private final ReviewListMapper reviewListMapper;

	/**
	 * 게시글 목록 조회 (검색/정렬/기간/장르 필터 + 페이징)
	 */
	public List<ReviewDTO> findList(ReviewListSearchDTO searchDTO) {
		// 페이지 보정
		if (searchDTO.getPage() < 1) searchDTO.setPage(1);
		searchDTO.setSize(PAGE_SIZE);
		searchDTO.setOffset((searchDTO.getPage() - 1) * PAGE_SIZE);
		return reviewListMapper.findList(searchDTO);
	}

	/**
	 * 위와 동일한 조건의 전체 건수 (페이지네이션 totalPages 계산용)
	 */
	public int countList(ReviewListSearchDTO searchDTO) {
		return reviewListMapper.countList(searchDTO);
	}

	/**
	 * 취향 선택 모달용 전체 장르 목록
	 */
	public List<GenreCategoryDTO> findAllGenres() {
		return reviewListMapper.findAllGenres();
	}

	public int getPageSize() {
		return PAGE_SIZE;
	}

	/**
	 * 메인 화면 - 인기 리뷰글(플랫폼별 top5). platform은 "all"/"netflix"/"tving"/"disney"/"etc".
	 */
	public List<ReviewDTO> getPopularReviews(String platform) {
		return reviewListMapper.findPopular(platform, POPULAR_LIST_SIZE);
	}
}
