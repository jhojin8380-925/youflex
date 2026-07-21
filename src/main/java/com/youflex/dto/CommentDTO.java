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
public class CommentDTO {
    private int commentId;
    private int memberId;
    private int reviewId;
    private int parentId; // 0이면 최상위 댓글(대댓글 아님) - DB의 parent_id NULL과 매핑(NULLIF/COALESCE로 변환)

    private String commentContent;
    private String commentDeleteStatus;
    private LocalDateTime commentCreatedAt;
    private LocalDateTime commentUpdatedAt;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
    private int likeCount;
    private boolean likedByMe;

    // 댓글 목록 조회 시 CommentService가 채워주는 값 (DB 컬럼 아님)
    private boolean best; // 좋아요 상위 3개(1개 이상) 안에 들면 true - 베스트 댓글로 표시
    @Builder.Default
    private List<CommentDTO> replies = List.of(); // 이 댓글에 달린 대댓글(1단계만 지원)
}
