package com.youflex.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.AdminAnswerDTO;
import com.youflex.mapper.AdminAnswerMapper;
import com.youflex.mapper.QnaMapper;

/**
 * 관리자 답변(AdminAnswer) 관련 비즈니스 로직
 * - 답변 조회, 등록/수정, 삭제 처리
 * - 답변 등록/수정 시 연관된 Qna의 상태(status)도 함께 갱신
 */
@Service
@RequiredArgsConstructor
public class AdminAnswerService {

    private final AdminAnswerMapper adminAnswerMapper;
    private final QnaMapper qnaMapper;

    /**
     * 특정 질문(qnaId)에 등록된 관리자 답변 조회
     * @param qnaId 질문 ID
     * @return 답변 정보 (없으면 null)
     */
    public AdminAnswerDTO getAnswer(int qnaId) {
        return adminAnswerMapper.selectAnswerByQnaId(qnaId);
    }

    /**
     * 답변 등록 또는 수정 (겸용)
     * - 기존 답변이 없으면 신규 등록, 있으면 기존 답변 내용을 수정
     * - 처리 후 해당 질문의 상태를 "답변완료"로 갱신
     * @param qnaId 질문 ID
     * @param content 답변 내용
     */
    @Transactional
    public void saveAnswer(int qnaId, String content) {
        // 기존 답변 존재 여부 확인
        AdminAnswerDTO existing = adminAnswerMapper.selectAnswerByQnaId(qnaId);
        if (existing == null) {
            // 답변이 없으면 신규 등록
            AdminAnswerDTO answer = AdminAnswerDTO.builder()
                    .qnaId(qnaId)
                    .adminAnswerContent(content)
                    .build();
            adminAnswerMapper.insertAnswer(answer);
        } else {
            // 기존 답변이 있으면 내용만 갱신하여 수정
            existing.setAdminAnswerContent(content);
            adminAnswerMapper.updateAnswer(existing);
        }
        // 답변 등록/수정 시 qna 상태를 답변완료로 전환
        // qna_status는 enum('답변대기','답변완료')라서 영어 "DONE"을 넣으면 제약조건 위반으로 실패함
        qnaMapper.updateQnaStatus(qnaId, "답변완료");
    }

    /**
     * 답변 삭제
     * - 답변만 삭제하며, 삭제 후 Qna 상태를 다시 "대기" 등으로 되돌리는 로직은 없음
     * @param adminAnswerId 삭제할 답변 ID
     */
    @Transactional
    public void deleteAnswer(int adminAnswerId) {
        adminAnswerMapper.deleteAnswer(adminAnswerId);
    }
}
