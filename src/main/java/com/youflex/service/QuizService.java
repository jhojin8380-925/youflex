package com.youflex.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.QuizAttemptDTO;
import com.youflex.dto.QuizDTO;
import com.youflex.mapper.QuizMapper;

import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;

// 퀴즈 - 객관식/OX 합쳐서 하루 3회 제한, 채팅 입력창에 타이핑한 답을 서버에서 채점
@Service
@RequiredArgsConstructor
public class QuizService {

    private static final int DAILY_ATTEMPT_LIMIT = 3;

    private final QuizMapper quizMapper;
    private final PointService pointService;

    // 오늘 남은 응시 횟수(객관식/OX 통합)
    public int getRemainingAttempts(int memberId) {
        int used = quizMapper.countTodayAttempts(memberId);
        return Math.max(0, DAILY_ATTEMPT_LIMIT - used);
    }

    // 랜덤 문제 1개(객관식/OX 구분 없이 통째로 뽑음). 직전에 응시한 문제는 제외됨. 남은 횟수가 없으면 null.
    public QuizDTO getRandomQuiz(int memberId) {
        if (getRemainingAttempts(memberId) <= 0) {
            return null;
        }
        return quizMapper.selectRandomQuiz(memberId);
    }

    // 정답 제출 - 채점 + 시도기록 저장(맞아도 틀려도 1회 소모) + 정답이면 포인트 지급까지 한 트랜잭션으로 처리
    @Transactional
    public QuizResult submitAnswer(int memberId, int quizId, String userAnswer) {
        if (getRemainingAttempts(memberId) <= 0) {
            throw new IllegalStateException("오늘 퀴즈 응시 횟수를 모두 사용했습니다.");
        }
        QuizDTO quiz = quizMapper.findById(quizId);
        if (quiz == null) {
            throw new IllegalStateException("존재하지 않는 문제입니다.");
        }

        boolean correct = isCorrect(quiz, userAnswer);

        // 정답/오답 상관없이 시도 자체는 기록(=하루 횟수 1회 소모)
        quizMapper.insertQuizAttempt(QuizAttemptDTO.builder()
                .quizId(quizId)
                .memberId(memberId)
                .quizAttemptCheck(correct)
                .build());

        int pointsAwarded = 0;
        if (correct) {
            pointsAwarded = quiz.getQuizPoint();
            pointService.awardPoints(memberId, pointsAwarded, "퀴즈 정답");
        }

        return QuizResult.builder()
                .correct(correct)
                .explanation(quiz.getQuizExplanation())
                .pointsAwarded(pointsAwarded)
                .remainingAttempts(getRemainingAttempts(memberId))
                .build();
    }

    // 객관식은 보기 번호(1~4) 비교, OX는 O/X 문자를 quiz_ox_answer(1=O, 0=X)로 변환해 비교.
    // 채팅창에 직접 타이핑하는 방식이라 앞뒤 공백/대소문자는 관대하게 처리함.
    private boolean isCorrect(QuizDTO quiz, String userAnswer) {
        String normalized = userAnswer == null ? "" : userAnswer.trim().toUpperCase();
        if ("객관식".equals(quiz.getQuizType())) {
            try {
                return Integer.parseInt(normalized) == quiz.getQuizAnswer();
            } catch (NumberFormatException e) {
                return false;
            }
        }
        int answer = switch (normalized) {
            case "O", "1" -> 1;
            case "X", "0" -> 0;
            default -> -1;
        };
        return answer == quiz.getQuizOxAnswer();
    }

    @Data
    @Builder
    public static class QuizResult {
        private boolean correct;
        private String explanation;
        private int pointsAwarded;
        private int remainingAttempts;
    }
}
