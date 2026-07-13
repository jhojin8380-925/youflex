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
public class QuizAttemptDTO {
    private int quizAttemptId;
    private int quizId;
    private int memberId;
    private Boolean quizAttemptCheck;
    private LocalDateTime quizAttemptAttemptedAt;
}
