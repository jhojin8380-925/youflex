
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
public class AdminAnswerDTO {
    private int adminAnswerId;
    private int qnaId;
    private String adminAnswerContent;
    private LocalDateTime adminAnswerCreatedAt;
    private LocalDateTime adminAnswerUpdatedAt;
}
