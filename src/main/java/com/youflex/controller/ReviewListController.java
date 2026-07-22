package com.youflex.controller;

import java.util.List;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.youflex.dto.ReviewDTO;
import com.youflex.dto.ReviewListSearchDTO;
import com.youflex.service.ReviewListService;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ReviewListController {

	private final ReviewListService reviewListService;

	/**
	 * 게시글 목록 페이지
	 * - /review/list
	 * - /review/list?page=2
	 * - /review/list?keyword=검색어&sort=latest&period=all
	 */
	@GetMapping("/review/list")
	public String list(ReviewListSearchDTO searchDTO, Model model) {

		// 게시글 목록 조회 (서비스에서 offset/size 자동 세팅)
		List<ReviewDTO> postList = reviewListService.findList(searchDTO);

		// 전체 건수 → 총 페이지 수 계산
		int totalCount = reviewListService.countList(searchDTO);
		int pageSize = reviewListService.getPageSize();
		int totalPages = (int) Math.ceil((double) totalCount / pageSize);

		model.addAttribute("postList", postList);
		model.addAttribute("currentPage", searchDTO.getPage());
		model.addAttribute("totalPages", totalPages);
		model.addAttribute("keyword", searchDTO.getKeyword());
		model.addAttribute("sort", searchDTO.getSort() == null ? "latest" : searchDTO.getSort());
		model.addAttribute("platform", searchDTO.getPlatform() == null ? "all" : searchDTO.getPlatform());

		return "review/list";
	}
}
