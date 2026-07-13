package com.youflex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDraftDTO {
    private int reviewDraftId;
    private int memberId;
    private int genreCategoryId;
    private String reviewDraftTitle;
    private String reviewDraftContent;
    private String reviewDraftSavedAt;
}
