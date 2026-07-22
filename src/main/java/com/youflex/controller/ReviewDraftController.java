package com.youflex.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
	public ResponseEntity<String> saveDraft(@RequestBody ReviewDraftDTO draftDTO, HttpSession session){	//@RequestBody가 빠져있어서 js로부터 오는 raw JSON바디를 Spring이 파싱할 수 없음. 그래서 계속 새롭게 임시저장이 되었던 것.
	    MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
	    if (loginMember == null) {
	        return ResponseEntity.status(401).body("UNAUTHORIZED");
	    }

	    int memberId = (int) loginMember.getMemberId();
	    draftDTO.setMemberId(memberId);

	    String result = draftService.saveOrUpdateDraft(draftDTO);

	    return ResponseEntity.ok(result);
	}

	// 2. 임시저장 목록 조회(최대 5개)
	@GetMapping("/review/draft/list")
	public ResponseEntity<?> getDraftList(HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return ResponseEntity.status(401).body("UNAUTHORIZED");
		}

		int memberId = (int) loginMember.getMemberId();
		List<ReviewDraftDTO> list = draftService.getDraftList(memberId);
		return ResponseEntity.ok(list);
	}

	// 3. 임시저장 상세 조회 (불러오기)
	@GetMapping("/review/draft/detail/{draftId}")
	public ResponseEntity<?> getDraftDetail(@PathVariable("draftId") int draftId, HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return ResponseEntity.status(401).body("UNAUTHORIZED");
		}

		ReviewDraftDTO draft = draftService.getDraftDetail(draftId);
		return ResponseEntity.ok(draft);
	}

	// 4. 임시저장 삭제
	@DeleteMapping("/review/draft/delete/{draftId}")	//<-이 부분이 빠져있어서 임시저장글 삭제가 안되었음. write.js의 fetch(`/review/draft/delete/${draftId}`, { method: 'DELETE' })와 연결이 안되어있었음.
	public ResponseEntity<String> deleteDraft(@PathVariable("draftId") int draftId, HttpSession session) {
	    MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
	    if (loginMember == null) {
	        return ResponseEntity.status(401).body("UNAUTHORIZED");
	    }

	    boolean isDeleted = draftService.deleteDraft(draftId);
	    if (isDeleted) {
	        return ResponseEntity.ok("SUCCESS");
	    } else {
	        return ResponseEntity.status(500).body("FAIL");
	    }
	}
}