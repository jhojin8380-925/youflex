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
public class QnaDTO {
    private int qnaId;
    private int memberId;
    private String qnaTitle;
    private String qnaContent;
    private int qnaHit;
    private LocalDateTime qnaCreatedAt;
    private LocalDateTime qnaUpdatedAt;
    private String qnaStatus;
    private String qnaIsSecret;
    // join 조회용 (DB 컬럼 아님)
    private String memberName;
}
