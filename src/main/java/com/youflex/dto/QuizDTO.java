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
public class QuizDTO {
    private int quizId;
    private String quizContent;
    private String quizType;
    private String quizOption1;
    private String quizOption2;
    private String quizOption3;
    private String quizOption4;
    private int quizAnswer;
    private String quizExplanation;
    private String quizOx;
    private int quizOxAnswer;
    private int quizPoint;
}
