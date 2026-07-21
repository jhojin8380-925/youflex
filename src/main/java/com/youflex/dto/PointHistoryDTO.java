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
public class PointHistoryDTO {
    private int pointHistoryId;
    private int memberId;
    private int pointHistoryAmount;
    private String pointHistoryType;
    private String pointHistoryReason;
    private LocalDateTime pointHistoryCreatedAt;
    private LocalDateTime pointHistoryUpdatedAt;

    // 마이페이지 "포인트 내역" 탭 표시용 - 이 거래 직후 잔액(DB 컬럼 아님, PointService가 계산해서 채움)
    private int pointHistoryBalance;
}
