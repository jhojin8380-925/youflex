package com.youflex.controller.qna;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.qna.QnaDTO;
import com.youflex.dto.qna.QnaCommentDTO;
import com.youflex.dto.QnaReportDTO;
import com.youflex.dto.QnaCommentReportDTO;
import com.youflex.dto.MemberDTO;
import com.youflex.exception.BadWordDetectedException;
import com.youflex.service.qna.QnaService;
import com.youflex.service.qna.QnaCommentService;
import com.youflex.service.QnaReportService;
import com.youflex.service.QnaCommentReportService;
import jakarta.servlet.http.HttpSession;

/**
 * Q&A(질문/답변) 관련 API 컨트롤러
 * - 질문 CRUD, 댓글 CRUD, 질문/댓글 신고 기능을 포함
 */
@RestController
@RequestMapping("/api/qna")
@RequiredArgsConstructor
public class QnaController {

    private final QnaService qnaService;
    private final QnaCommentService qnaCommentService;
    private final QnaReportService qnaReportService;
    private final QnaCommentReportService qnaCommentReportService;

    // ---- 질문 ----

    /**
     * 전체 질문 목록 조회
     * @return 질문 리스트 (200 OK)
     */
    @GetMapping
    public ResponseEntity<List<QnaDTO>> getQnaList() {
        return ResponseEntity.ok(qnaService.getQnaList());
    }

    /**
     * 특정 질문 상세 조회
     * - 비밀글이면 작성자 본인 또는 관리자만 조회 가능 (그 외에는 403 Forbidden)
     * @param qnaId 조회할 질문 ID
     * @param session 로그인 세션 (작성자/관리자 여부 확인용, 비로그인이어도 공개글은 조회 가능)
     * @return 질문 상세 정보 (200 OK), 비밀글이고 권한 없으면 403 Forbidden
     */
    @GetMapping("/{qnaId}")
    public ResponseEntity<QnaDTO> getQnaDetail(@PathVariable("qnaId") int qnaId, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        Integer requesterMemberId = loginMember != null ? loginMember.getMemberId() : null;
        boolean isAdmin = loginMember != null && "관리자".equals(loginMember.getMemberGrade());
        try {
            return ResponseEntity.ok(qnaService.getQnaDetail(qnaId, requesterMemberId, isAdmin));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    /**
     * 질문 등록
     * - 로그인한 회원만 가능. 세션의 loginMember에서 memberId를 꺼내 세팅 (클라이언트 입력값 무시)
     * @param qnaDTO 등록할 질문 정보 (요청 바디)
     * @param session 로그인 세션 (loginMember 속성 확인용)
     * @return 등록 성공 시 201 Created, 미로그인 시 401 Unauthorized
     */
    @PostMapping
    public ResponseEntity<?> createQna(@RequestBody QnaDTO qnaDTO, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        qnaDTO.setMemberId(loginMember.getMemberId());
        try {
            qnaService.createQna(qnaDTO);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (BadWordDetectedException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 질문 수정
     * - 작성자 본인만 가능하도록 세션 기준으로 검증
     * @param qnaId 수정할 질문 ID (경로 변수)
     * @param qnaDTO 수정할 내용을 담은 요청 바디
     * @param session 로그인 세션
     * @return 수정 성공 시 200 OK, 미로그인 시 401, 존재하지 않으면 404, 본인이 아니면 403
     */
    @PutMapping("/{qnaId}")
    public ResponseEntity<?> updateQna(@PathVariable("qnaId") int qnaId, @RequestBody QnaDTO qnaDTO,
                                           HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // 경로 변수의 qnaId를 DTO에 강제로 세팅하여 요청 바디 값과의 불일치 방지
        qnaDTO.setQnaId(qnaId);
        try {
            qnaService.updateQna(qnaDTO, loginMember.getMemberId());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (BadWordDetectedException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 질문 삭제
     * - 작성자 본인 또는 관리자만 가능하도록 세션 기준으로 검증
     * @param qnaId 삭제할 질문 ID
     * @param session 로그인 세션
     * @return 삭제 성공 시 204 No Content, 미로그인 시 401
     */
    @DeleteMapping("/{qnaId}")
    public ResponseEntity<Void> deleteQna(@PathVariable("qnaId") int qnaId, HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // TODO: qnaService 쪽에서 작성자 본인 또는 관리자(loginMember.getMemberGrade() 등) 여부 확인 필요
        qnaService.deleteQna(qnaId);
        return ResponseEntity.noContent().build();
    }

    // ---- 댓글 ----

    /**
     * 특정 질문에 달린 댓글 목록 조회
     * @param qnaId 질문 ID
     * @return 댓글 리스트 (200 OK)
     */
    @GetMapping("/{qnaId}/comments")
    public ResponseEntity<List<QnaCommentDTO>> getComments(@PathVariable("qnaId") int qnaId) {
        return ResponseEntity.ok(qnaCommentService.getComments(qnaId));
    }

    /**
     * 특정 질문에 댓글 등록
     * - 로그인한 회원만 가능. 세션의 loginMember에서 memberId를 꺼내 세팅 (클라이언트 입력값 무시)
     * @param qnaId 댓글을 달 질문 ID
     * @param commentDTO 등록할 댓글 정보 (요청 바디)
     * @param session 로그인 세션
     * @return 등록 성공 시 201 Created, 미로그인 시 401 Unauthorized
     */
    @PostMapping("/{qnaId}/comments")
    public ResponseEntity<?> addComment(@PathVariable("qnaId") int qnaId, @RequestBody QnaCommentDTO commentDTO,
                                            HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // 경로 변수의 qnaId를 DTO에 세팅하여 어느 질문에 대한 댓글인지 명확히 함
        commentDTO.setQnaId(qnaId);
        // 클라이언트가 보낸 memberId는 무시하고 세션의 로그인 정보로 강제 세팅 (FK 오류 및 위변조 방지)
        commentDTO.setMemberId(loginMember.getMemberId());
        try {
            qnaCommentService.addComment(commentDTO);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (BadWordDetectedException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 댓글 수정
     * - 로그인한 회원만 가능. 작성자 본인 여부는 QnaCommentService에서 검증
     * @param qnaCommentId 수정할 댓글 ID
     * @param commentDTO 수정할 내용을 담은 요청 바디 (qnaCommentContent만 사용)
     * @param session 로그인 세션
     * @return 수정 성공 시 200 OK, 미로그인 시 401, 존재하지 않으면 404, 본인이 아니면 403
     */
    @PutMapping("/comments/{qnaCommentId}")
    public ResponseEntity<?> updateComment(@PathVariable("qnaCommentId") int qnaCommentId,
                                               @RequestBody QnaCommentDTO commentDTO,
                                               HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            qnaCommentService.updateComment(qnaCommentId, commentDTO.getQnaCommentContent(), loginMember.getMemberId());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (BadWordDetectedException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 댓글 삭제
     * - 로그인한 회원만 가능. 세션의 memberId를 기준으로 본인 댓글 여부는 QnaCommentService에서 검증
     * @param qnaCommentId 삭제할 댓글 ID
     * @param session 로그인 세션
     * @return 삭제 성공 시 204 No Content, 미로그인 시 401 Unauthorized
     */
    @DeleteMapping("/comments/{qnaCommentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable("qnaCommentId") int qnaCommentId,
                                               HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // 쿼리 파라미터로 memberId를 받던 기존 방식 제거 - 세션의 로그인 정보만 신뢰
        qnaCommentService.deleteComment(qnaCommentId, loginMember.getMemberId());
        return ResponseEntity.noContent().build();
    }

    // ---- 질문 신고 ----

    /**
     * 질문 신고 등록
     * - 로그인한 회원만 가능
     * @param qnaId 신고 대상 질문 ID
     * @param reportDTO 신고 사유 등을 담은 요청 바디
     * @param session 로그인 세션
     * @return 등록 성공 시 201 Created, 미로그인 시 401 Unauthorized
     */
    @PostMapping("/{qnaId}/report")
    public ResponseEntity<Void> reportQna(@PathVariable("qnaId") int qnaId, @RequestBody QnaReportDTO reportDTO,
                                           HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        reportDTO.setQnaId(qnaId);
        // 클라이언트가 보낸 memberId는 무시하고 세션의 로그인 정보로 강제 세팅 (위변조 방지)
        reportDTO.setMemberId(loginMember.getMemberId());
        qnaReportService.reportQna(reportDTO);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    // ---- 댓글 신고 ----

    /**
     * 댓글 신고 등록
     * - 로그인한 회원만 가능
     * @param qnaCommentId 신고 대상 댓글 ID
     * @param reportDTO 신고 사유 등을 담은 요청 바디
     * @param session 로그인 세션
     * @return 등록 성공 시 201 Created, 미로그인 시 401 Unauthorized
     */
    @PostMapping("/comments/{qnaCommentId}/report")
    public ResponseEntity<Void> reportComment(@PathVariable("qnaCommentId") int qnaCommentId,
                                               @RequestBody QnaCommentReportDTO reportDTO,
                                               HttpSession session) {
        MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
        if (loginMember == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        reportDTO.setQnaCommentId(qnaCommentId);
        // 클라이언트가 보낸 memberId는 무시하고 세션의 로그인 정보로 강제 세팅 (위변조 방지)
        reportDTO.setMemberId(loginMember.getMemberId());
        qnaCommentReportService.reportComment(reportDTO);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}