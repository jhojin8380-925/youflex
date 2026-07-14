package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.youflex.dto.ReviewDTO;
import com.youflex.mapper.BookmarkMapper;
import com.youflex.mapper.CommentMapper;
import com.youflex.mapper.ReviewDraftMapper;
import com.youflex.mapper.ReviewLikeMapper;
import com.youflex.mapper.ReviewMapper;
import com.youflex.mapper.ReviewReportMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewService {
	private final ReviewMapper reviewMapper;
	private final CommentMapper commentMapper;
	// 좋아요, 북마크, 신고, 게시글 입시저장
	private final ReviewLikeMapper reviewLikeMapper;
	private final BookmarkMapper bookmarkMapper;
	private final ReviewReportMapper reviewReportMapper;
	private final ReviewDraftMapper reviewDraftMapper;
	
//	1) 게시글 저장
	public void write(ReviewDTO reviewDTO) {
		reviewMapper.write(reviewDTO);
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
	
}