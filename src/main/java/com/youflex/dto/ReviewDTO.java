package com.youflex.dto;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ReviewDTO {
    private int reviewId;
    private int memberId;
    private List<Integer> genreCategoryId;
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

    // 파일 업로드 추가
    private MultipartFile imgFile;
    
    // join 조회용 (DB 컬럼 아님)
    private String memberName;
    private String memberProfileImg;
    private String memberGrade;
    private String genreCategoryName;
    private int likeCount;
    private int commentCount;
    
    private List<GenreCategoryDTO> genreList;
}