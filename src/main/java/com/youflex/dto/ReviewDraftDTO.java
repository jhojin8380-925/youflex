package com.youflex.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewDraftDTO {
    private int reviewDraftId;
    private int memberId;
    private int genreCategoryId;
    private String reviewDraftTitle;
    private String reviewDraftContent;
    private LocalDateTime reviewDraftSavedAt;

    // join 조회용 (DB 컬럼 아님)
    private String genreCategoryName;
}
