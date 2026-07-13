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
public class PointHistoryDTO {
    private int pointHistoryId;
    private int memberId;
    private int pointHistoryAmount;
    private String pointHistoryType;
    private String pointHistoryCreatedAt;
    private String pointHistoryUpdatedAt;
}
