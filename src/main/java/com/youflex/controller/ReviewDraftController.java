package com.youflex.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
	
	private final ReviewDraftService draftService;
	
	@PostMapping("/review/draft/save")
	public ResponseEntity<String> saveDraft(ReviewDraftDTO draftDTO, HttpSession session){
		MemberDTO loginMember = (MemberDTO)session.getAttribute("loginMember");
		if(loginMember == null) {
			return ResponseEntity.status(401).body("UNAUTHORIZED");
		}
		// 로그인된 회원 ID 세팅
		int memberId = (int)loginMember.getMemberId();
		draftDTO.setMemberId(memberId);
		
		// 현재 임시저장 개수 확인(5개 제한)
		int count = draftService.countDraftByMemberId(memberId);
		if(count >= 5) {
			return ResponseEntity.ok("MAX_LIMIT_EXCEEDED");
		}
		
		// 들어오는 데이터 검증용 로그(콘솔에서 확인해보세요)
		System.out.println("=== 임시저장 요청 데이터 ===");
	    System.out.println("Title: " + draftDTO.getReviewDraftTitle());
	    System.out.println("Content: " + draftDTO.getReviewDraftContent());
	    System.out.println("Related: " + draftDTO.getReviewDraftRelated());
	    
	    draftService.saveDraft(draftDTO);
	    
	    return ResponseEntity.ok("SUCCESS");
	}

	// 2. 임시저장 목록 조회(최대 5개)
	@GetMapping("/review/draft/list")
	public ResponseEntity<?> getDraftList(HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return ResponseEntity.status(401).body("UNAUTHORIZED");
		}

		// int / Long 타입 변환 안전하게 처리 (500 에러 방지)
		int memberId = (int) loginMember.getMemberId();
		List<ReviewDraftDTO> list = draftService.getDraftListByMemberId(memberId);
		return ResponseEntity.ok(list);
	}

	// 3. 임시저장 상세 조회 (불러오기)
	@GetMapping("/review/draft/detail/{draftId}")
	public ResponseEntity<?> getDraftDetail(@PathVariable("draftId") int draftId,  HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return ResponseEntity.status(401).body("UNAUTHORIZED");
		}

		// int memberId = (int) loginMember.getMemberId();

		ReviewDraftDTO draft = draftService.getDraftById(draftId);
		return ResponseEntity.ok(draft);
	}

	// 4. 임시저장 삭제
	@DeleteMapping("/review/draft/delete/{draftId}")
	public ResponseEntity<String> deleteDraft(@PathVariable("draftId") int draftId, HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return ResponseEntity.status(401).body("UNAUTHORIZED");
		}

		//int memberId = (int) loginMember.getMemberId();

		//draftService.deleteDraftByMemberId(memberId);
		draftService.deleteDraftById(draftId);
		return ResponseEntity.ok("SUCCESS");
	}
}