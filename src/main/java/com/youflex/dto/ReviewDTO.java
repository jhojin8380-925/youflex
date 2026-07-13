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
public class ReviewDTO {
    private int reviewId;
    private int memberId;
    private int genreCategoryId;
    private String reviewTitle;
    private String reviewContent;
    private String reviewImg;
    private String reviewRelated;
    private int reviewHit;
    private Double reviewRating;
    private String reviewPlatform;
    private Boolean reviewHighlighted;
    private String reviewCreatedAt;
    private String reviewUpdatedAt;
}
