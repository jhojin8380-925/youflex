package com.youflex.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.MemberDTO;
import com.youflex.dto.ReviewDraftDTO;
import com.youflex.service.ReviewDraftService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ReviewDraftController {
	
	private final ReviewDraftService draftService ;
	
	@PostMapping("/review/draft/save")
	public ResponseEntity<String> saveDraft(ReviewDraftDTO draftDTO, HttpSession session){
		MemberDTO loginMember = (MemberDTO)session.getAttribute("loginMember");
		if(loginMember == null) {
			return ResponseEntity.status(401).body("UNAUTHORIZED");	// 모르는 부분
		}
		
		draftDTO.setMemberId(loginMember.getMemberId());
		draftService.saveDraft(draftDTO);
		
		return ResponseEntity.ok("SUCCESS");	// 모르는 부분
	}
}
