package com.youflex.controller.admin;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.MemberDTO;
import com.youflex.dto.admin.AdminAnswerDTO;
import com.youflex.service.admin.AdminAnswerService;
import jakarta.servlet.http.HttpSession;

/**
 * 관리자 답변(Q&A 답변) 관련 API 컨트롤러
 * - 특정 문의(qnaId)에 대한 답변 조회/등록/수정/삭제 기능을 제공
 */
@RestController
@RequestMapping("/api/qna/{qnaId}/answer")
@RequiredArgsConstructor
public class AdminAnswerController {

    private final AdminAnswerService adminAnswerService;

    /**
     * 특정 문의(qnaId)에 등록된 관리자 답변 조회
     * @param qnaId 문의 ID (경로 변수)
     * @return 답변이 존재하면 200 OK + 답변 정보, 없으면 204 No Content
     */
    @GetMapping
    public ResponseEntity<AdminAnswerDTO> getAnswer(@PathVariable("qnaId") int qnaId) {
        AdminAnswerDTO answer = adminAnswerService.getAnswer(qnaId);
        if (answer == null) {
            // 답변이 아직 등록되지 않은 경우
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(answer);
    }

    // 답변 등록/수정 겸용 - 관리자 전용
    /**
     * 답변 등록 또는 수정
     * - 기존 답변이 없으면 신규 등록, 있으면 수정 처리 (서비스 계층에서 분기)
     * @param qnaId 문의 ID
     * @param request 답변 내용을 담은 요청 바디
     * @return 성공 시 200 OK, 내용이 비어있으면 400 Bad Request
     */
    @PostMapping
    public ResponseEntity<?> saveAnswer(@PathVariable("qnaId") int qnaId, @RequestBody AnswerRequest request, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        if (request.getContent() == null || request.getContent().isBlank()) {
            // 답변 내용이 비어있으면 잘못된 요청으로 처리
            return ResponseEntity.badRequest().build();
        }
        adminAnswerService.saveAnswer(qnaId, request.getContent());
        return ResponseEntity.ok().build();
    }

    // 답변 삭제 - 관리자 전용
    /**
     * 특정 답변 삭제
     * @param qnaId 문의 ID (URL 경로 상 존재하지만 실제 삭제 로직에는 사용되지 않음)
     * @param adminAnswerId 삭제할 답변 ID
     * @return 성공 시 204 No Content
     */
    @DeleteMapping("/{adminAnswerId}")
    public ResponseEntity<?> deleteAnswer(@PathVariable("qnaId") int qnaId, @PathVariable("adminAnswerId") int adminAnswerId, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        adminAnswerService.deleteAnswer(adminAnswerId);
        return ResponseEntity.noContent().build();
    }

    // 세션의 로그인 회원이 관리자 등급인지 확인 (memberGrade == '관리자')
    private boolean isAdmin(HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        return loginMemberObj instanceof MemberDTO loginMember
                && "관리자".equals(loginMember.getMemberGrade());
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "관리자만 접근할 수 있습니다."));
    }

    /**
     * 답변 등록/수정 요청 DTO
     */
    @Data
    static class AnswerRequest {
        private String content; // 답변 내용
    }
}