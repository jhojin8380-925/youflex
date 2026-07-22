package com.youflex.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.ReviewDraftDTO;
import com.youflex.mapper.ReviewDraftMapper;

@Service
public class ReviewDraftService {

	@Autowired
	private ReviewDraftMapper reviewDraftMapper;

	@Transactional
	public String saveOrUpdateDraft(ReviewDraftDTO draftDTO) {
		// 신규 임시저장(id가 0)일 때만 최대 5개 개수 제한 검사
		if (draftDTO.getReviewDraftId() == 0) {
			int currentCount = reviewDraftMapper.countDraftByMemberId(draftDTO.getMemberId());
			if (currentCount >= 5) {
				return "MAX_LIMIT_EXCEEDED";
			}
			// 신규 저장 (INSERT)
			reviewDraftMapper.insertDraft(draftDTO);
		} else {
			// 2. 이미 등록된 임시저장글 수정 시 UPDATE 처리
			reviewDraftMapper.updateDraft(draftDTO);
		}
		return String.valueOf(draftDTO.getReviewDraftId());
	}
	
	// 필요 시 컨트롤러에서 임시저장 개수만 따로 조회할 수 있도록 하는 메서드
	public int countDraftByMemberId(int memberId) {
		return reviewDraftMapper.countDraftByMemberId(memberId);
	}

	public List<ReviewDraftDTO> getDraftList(int memberId) {
        return reviewDraftMapper.selectDraftListByMemberId(memberId);
    }

	public ReviewDraftDTO getDraftDetail(int reviewDraftId) {
        return reviewDraftMapper.selectDraftById(reviewDraftId);
    }

	public boolean deleteDraft(int reviewDraftId) {
        return reviewDraftMapper.deleteDraftById(reviewDraftId) > 0;
    }
}