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
public class ReviewLikeDTO {
    private int reviewLikeId;
    private int reviewId;
    private int memberId;
    private LocalDateTime reviewLikeCreatedAt;
}
