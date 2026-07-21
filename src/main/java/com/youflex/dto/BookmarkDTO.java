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
public class BookmarkDTO {
    private int bookmarkId;
    private int reviewId;
    private int memberId;
    private LocalDateTime bookmarkCreatedAt;

    // join 조회용 (DB 컬럼 아님)
    private String reviewTitle;
    private String reviewImg;
    private String memberName;
}
