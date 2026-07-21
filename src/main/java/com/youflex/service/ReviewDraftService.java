package com.youflex.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.ReviewDraftDTO;
import com.youflex.mapper.ReviewDraftMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewDraftService {
	
	private final ReviewDraftMapper draftMapper;
	
	// 1. 임시저장 (기존 임시저장 삭제 후 신규 저장)
	@Transactional
	public void saveDraft(ReviewDraftDTO draftDTO) {
		draftMapper.deleteDraftByMemberId(draftDTO.getMemberId());
		draftMapper.insertDraft(draftDTO);
	}

	// 2. 임시저장 조회
	@Transactional(readOnly = true)
	public ReviewDraftDTO getDraftByMemberId(int memberId) {
		return draftMapper.selectDraftByMemberId(memberId);
	}

	// 3. 임시저장 삭제
	@Transactional
	public void deleteDraftByMemberId(int memberId) {
		draftMapper.deleteDraftByMemberId(memberId);
	}
}