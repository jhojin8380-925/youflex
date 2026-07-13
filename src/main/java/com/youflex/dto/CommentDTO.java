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
public class CommentDTO {
    private int commentId;
    private int memberId;
    private int reviewId;
    private int parentId;
    private String commentContent;
    private String commentCreatedAt;
    private String commentUpdatedAt;
}
