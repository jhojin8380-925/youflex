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
public class QuizAttemptDTO {
    private int quizAttemptId;
    private int quizId;
    private int memberId;
    private Boolean quizAttemptCheck;
    private String quizAttemptedAt;
}
