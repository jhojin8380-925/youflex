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
public class QnaCommentDTO {
    private int qnaCommentId;
    private int qnaId;
    private int memberId;
    private String qnaCommentContent;
    private String qnaCommentCreatedAt;
    private String qnaCommentUpdatedAt;
}
