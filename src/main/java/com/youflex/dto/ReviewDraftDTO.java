package com.youflex.dto;

import java.time.LocalDateTime;
import java.util.List;

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
    private String reviewDraftTitle;
    private String reviewDraftContent;
    private LocalDateTime reviewDraftSavedAt;
    private String reviewDraftRelated;
}
