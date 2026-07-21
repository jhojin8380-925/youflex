package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.ReviewDraftDTO;
import com.youflex.mapper.ReviewDraftMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewDraftService {
	
	private final ReviewDraftMapper draftMapper;
	
	// 1. 회원당 현재 임시저장 개수 조회(5개 제한 체크용)
	@Transactional(readOnly = true)
	public int countDraftByMemberId(int memberId) {
		return draftMapper.countDraftByMemberId(memberId);
	}
	
	// 2. 임시저장 신규 생성(기존 건 삭제 없이 누적 저장)
	@Transactional
	public void saveDraft(ReviewDraftDTO draftDTO) {
		draftMapper.insertDraft(draftDTO);
	}
	
	// 3. 회원별 임시저장 전체 목록 조회(최신순 5개까지)
	@Transactional(readOnly = true)
	public List<ReviewDraftDTO> getDraftListByMemberId(int memberId){
		return draftMapper.selectDraftListByMemberId(memberId);
	}
	
	// 4. 특정 임시저장 단건 상세 조회(불러오기용)
	@Transactional(readOnly = true)
	public ReviewDraftDTO getDraftById(int reviewDraftId) {
		return draftMapper.selectDraftById(reviewDraftId);
	}
	
	// 5. 특정 임시저장 개별 삭제
	@Transactional
	public void deleteDraftById(int reviewDraftId) {
		draftMapper.deleteDraftById(reviewDraftId);
	}
	
//	// 1. 임시저장 (기존 임시저장 삭제 후 신규 저장)
//	@Transactional
//	public void saveDraft(ReviewDraftDTO draftDTO) {
//		draftMapper.deleteDraftByMemberId(draftDTO.getMemberId());
//		draftMapper.insertDraft(draftDTO);
//	}
//
//	// 2. 임시저장 조회
//	@Transactional(readOnly = true)
//	public ReviewDraftDTO getDraftByMemberId(int memberId) {
//		return draftMapper.selectDraftByMemberId(memberId);
//	}
//
//	// 3. 임시저장 삭제
//	@Transactional
//	public void deleteDraftByMemberId(int memberId) {
//		draftMapper.deleteDraftByMemberId(memberId);
//	}
}