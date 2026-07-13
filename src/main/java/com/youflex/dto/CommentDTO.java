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
public class CommentDTO {
    private int commentId;
    private int memberId;
    private int reviewId;
    private int parentId;
    private String commentContent;
    private String commentDeleteStatus;
    private LocalDateTime commentCreatedAt;
    private LocalDateTime commentUpdatedAt;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
    private int likeCount;
}
