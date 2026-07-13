package com.youflex.dto;

import java.time.LocalDateTime;

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
public class PointHistoryDTO {
    private int pointHistoryId;
    private int memberId;
    private int pointHistoryAmount;
    private String pointHistoryType;
    private LocalDateTime  pointHistoryCreatedAt;
    private LocalDateTime  pointHistoryUpdatedAt;
}
