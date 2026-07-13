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
public class ReviewDTO {
    private int reviewId;
    private int memberId;
    private int genreCategoryId;
    private String reviewPlatform;
    private String reviewRelated;
    private String reviewTitle;
    private String reviewContent;
    private String reviewImg;
    private int reviewHit;
    private Double reviewRating;
    private String reviewHighlighted;
    private LocalDateTime reviewHighlightStartedAt;
    private LocalDateTime reviewHighlightExpiredAt;
    private LocalDateTime reviewCreatedAt;
    private LocalDateTime reviewUpdatedAt;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
    private String genreCategoryName;
    private int likeCount;
    private int commentCount;
}
