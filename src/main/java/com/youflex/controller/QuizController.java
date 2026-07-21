package com.youflex.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.MemberDTO;
import com.youflex.dto.QuizDTO;
import com.youflex.service.QuizService;
import com.youflex.service.QuizService.QuizResult;

import jakarta.servlet.http.HttpSession;
import lombok.Data;
import lombok.RequiredArgsConstructor;

// 퀴즈 - 사이트 전체 퀴즈 패널(fragments/layout.html)에서 fetch로 호출하는 API.
// 로그인한 회원만 이용 가능(비회원은 401).
@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    // 문제 하나 요청. 남은 횟수가 0이면 quiz는 빈 값으로 내려주고 remainingAttempts만 0으로 응답.
    @GetMapping("/random")
    public ResponseEntity<?> random(HttpSession session) {
        MemberDTO loginMember = loginMember(session);
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        int remaining = quizService.getRemainingAttempts(loginMember.getMemberId());
        QuizDTO quiz = remaining > 0 ? quizService.getRandomQuiz(loginMember.getMemberId()) : null;
        return ResponseEntity.ok(Map.of(
                "remainingAttempts", remaining,
                "quiz", quiz == null ? Map.of() : toPublicQuiz(quiz)
        ));
    }

    // 정답 제출 - 채팅 입력창에 타이핑한 값을 answer로 그대로 받아 서버에서 채점
    @PostMapping("/answer")
    public ResponseEntity<?> answer(@RequestBody AnswerRequest request, HttpSession session) {
        MemberDTO loginMember = loginMember(session);
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            QuizResult result = quizService.submitAnswer(loginMember.getMemberId(), request.getQuizId(), request.getAnswer());
            return ResponseEntity.ok(Map.of(
                    "correct", result.isCorrect(),
                    "explanation", result.getExplanation() == null ? "" : result.getExplanation(),
                    "pointsAwarded", result.getPointsAwarded(),
                    "remainingAttempts", result.getRemainingAttempts()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private MemberDTO loginMember(HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        return loginMemberObj instanceof MemberDTO loginMember ? loginMember : null;
    }

    // 정답(quizAnswer/quizOxAnswer)·해설처럼 채점 전에 노출되면 안 되는 필드는 빼고 문제/보기만 내려줌
    private Map<String, Object> toPublicQuiz(QuizDTO quiz) {
        return Map.of(
                "quizId", quiz.getQuizId(),
                "quizType", quiz.getQuizType(),
                "quizContent", quiz.getQuizContent(),
                "quizOption1", quiz.getQuizOption1() == null ? "" : quiz.getQuizOption1(),
                "quizOption2", quiz.getQuizOption2() == null ? "" : quiz.getQuizOption2(),
                "quizOption3", quiz.getQuizOption3() == null ? "" : quiz.getQuizOption3(),
                "quizOption4", quiz.getQuizOption4() == null ? "" : quiz.getQuizOption4()
        );
    }

    @Data
    static class AnswerRequest {
        private int quizId;
        private String answer;
    }
}
