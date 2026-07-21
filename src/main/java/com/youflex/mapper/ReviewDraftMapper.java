package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.youflex.dto.ReviewDraftDTO;

@Mapper
public interface ReviewDraftMapper {
	
	// 1. 해당 회원의 현재 임시저장 개수 조회
	int countDraftByMemberId(int memberId);
	
	// 2. 신규 임시저장 INSERT
	void insertDraft(ReviewDraftDTO draftDTO);
	
	// 3. 회원의 임시저장 목록 조회
	List<ReviewDraftDTO> selectDraftListByMemberId(int memberId);
	
	// 4. 특정 임시저장 단건 상세 조회(불러오기용)
	ReviewDraftDTO selectDraftById(int reviewDraftId);
	
	// 5. 특정 임시저장 개별 삭제
	void deleteDraftById(int reviewDraftId);
}
