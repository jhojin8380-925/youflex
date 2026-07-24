package com.youflex.dto.qna;

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
    // join 조회용 (DB 컬럼 아님) - 관리자 페이지 "답변완료" 탭에서 7일 경과 여부 판단에 사용
    private LocalDateTime adminAnswerCreatedAt;
    // 계산 전용 (DB 컬럼 아님) - 답변일로부터 경과일. 관리자 페이지 "답변완료" 탭 표시용
    private long elapsedAnswerDays;
}
