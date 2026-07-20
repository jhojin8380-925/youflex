package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.youflex.dto.ReviewDraftDTO;

@Mapper
public interface ReviewDraftMapper {
	void deleteDraftByMemberId(int memberId);
	
	void insertDraft(ReviewDraftDTO draftDTO);
	
	ReviewDraftDTO selectDraftByMemberId(int memberId);
}
