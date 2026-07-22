package com.youflex.service.qna;

import java.util.List;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.qna.QnaCommentDTO;
import com.youflex.mapper.qna.QnaCommentMapper;
import com.youflex.service.BadWordService;

/**
 * Q&A 댓글(QnaComment) 관련 비즈니스 로직
 * - 댓글 조회, 등록, 삭제 처리
 * - 삭제 시 작성자 본인 확인 로직 포함
 */
@Service
@RequiredArgsConstructor
public class QnaCommentService {

    private final QnaCommentMapper qnaCommentMapper;
    private final BadWordService badWordService;

    /**
     * 특정 질문(qnaId)에 달린 댓글 목록 조회
     * @param qnaId 질문 ID
     * @return 댓글 리스트
     */
    public List<QnaCommentDTO> getComments(int qnaId) {
        return qnaCommentMapper.selectCommentsByQnaId(qnaId);
    }

    /**
     * 댓글 등록
     * @param commentDTO 등록할 댓글 정보 (qnaId, memberId, 내용 등 포함)
     */
    public void addComment(QnaCommentDTO commentDTO) {
        // 금칙어가 포함되어 있으면 등록 자체를 막음
        badWordService.validateContent(commentDTO.getQnaCommentContent());
        qnaCommentMapper.insertComment(commentDTO);
    }

    /**
     * 댓글 수정
     * - 댓글 존재 여부 확인 후, 요청자가 작성자 본인인지 검증
     * @param qnaCommentId 수정할 댓글 ID
     * @param newContent 수정할 내용
     * @param requesterMemberId 수정을 요청한 회원 ID
     * @throws IllegalArgumentException 댓글이 존재하지 않을 경우
     * @throws IllegalStateException 요청자가 작성자 본인이 아닐 경우
     */
    public void updateComment(int qnaCommentId, String newContent, int requesterMemberId) {
        QnaCommentDTO comment = qnaCommentMapper.selectCommentById(qnaCommentId);
        if (comment == null) {
            throw new IllegalArgumentException("존재하지 않는 댓글입니다.");
        }
        if (comment.getMemberId() != requesterMemberId) {
            throw new IllegalStateException("수정 권한이 없습니다.");
        }
        // 금칙어가 포함되어 있으면 수정도 막음 (필터 우회 방지)
        badWordService.validateContent(newContent);
        comment.setQnaCommentContent(newContent);
        qnaCommentMapper.updateComment(comment);
    }

    /**
     * 댓글 삭제
     * - 댓글 존재 여부 확인 후, 요청자가 작성자 본인인지 검증
     * - 관리자 권한에 의한 삭제(작성자가 아니어도 삭제 가능한 케이스)는
     *   Controller/Security 레벨에서 별도로 처리되어야 함 (현재 이 메서드는 본인 여부만 체크)
     * @param qnaCommentId 삭제할 댓글 ID
     * @param requesterMemberId 삭제를 요청한 회원 ID
     * @throws IllegalArgumentException 댓글이 존재하지 않을 경우
     * @throws IllegalStateException 요청자가 작성자 본인이 아닐 경우
     */
    public void deleteComment(int qnaCommentId, int requesterMemberId) {
        QnaCommentDTO comment = qnaCommentMapper.selectCommentById(qnaCommentId);
        if (comment == null) {
            throw new IllegalArgumentException("존재하지 않는 댓글입니다.");
        }
        // 작성자 본인 또는 관리자만 삭제 가능 - 관리자 체크는 Controller/Security에서 별도 처리 필요
        if (comment.getMemberId() != requesterMemberId) {
            throw new IllegalStateException("삭제 권한이 없습니다.");
        }
        qnaCommentMapper.deleteComment(qnaCommentId);
    }
}
