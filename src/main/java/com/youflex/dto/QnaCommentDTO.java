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
public class QnaCommentDTO {
    private int qnaCommentId;
    private int qnaId;
    private int memberId;
    private String qnaCommentContent;
    private LocalDateTime qnaCommentCreatedAt;
    private LocalDateTime qnaCommentUpdatedAt;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
}
