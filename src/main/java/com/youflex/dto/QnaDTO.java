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
public class QnaDTO {
    private int qnaId;
    private int memberId;
    private String qnaTitle;
    private String qnaContent;
    private LocalDateTime qnaCreatedAt;
    private LocalDateTime qnaUpdatedAt;
    private int qnaStatus;
    private String qnaIsSecret;
}
