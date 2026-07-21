package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.QuizAttemptDTO;
import com.youflex.dto.QuizDTO;

@Mapper
public interface QuizMapper {

    // 객관식/OX 구분 없이 전체 문제 중 랜덤으로 1개 조회. 이 회원이 직전에 응시한 문제는 제외해서 연속 출제를 막는다.
    QuizDTO selectRandomQuiz(@Param("memberId") int memberId);

    // 문제 단건 조회(정답 채점용 - quiz_answer/quiz_ox_answer/quiz_point/quiz_explanation까지 필요해서 씀)
    QuizDTO findById(@Param("quizId") int quizId);

    // 오늘 이 회원이 몇 번 풀었는지(quiz_attempt_date = 오늘) - 하루 3회(객관식/OX 통합) 제한 체크용
    int countTodayAttempts(@Param("memberId") int memberId);

    // 퀴즈 시도 기록 저장. quiz_attempt_date는 DB 트리거가 자동으로 채워주므로 여기서 안 넣음.
    void insertQuizAttempt(QuizAttemptDTO quizAttemptDTO);
}
