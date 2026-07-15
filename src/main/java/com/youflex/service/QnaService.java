package com.youflex.service;

import java.util.List;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.QnaDTO;
import com.youflex.mapper.QnaMapper;

/**
 * Q&A(질문) 관련 비즈니스 로직
 * - 질문 목록/상세 조회, 등록, 수정, 삭제 및 상태 변경(답변완료 처리) 담당
 */
@Service
@RequiredArgsConstructor
public class QnaService {

    private final QnaMapper qnaMapper;

    /**
     * 전체 질문 목록 조회
     * @return 질문 리스트
     */
    public List<QnaDTO> getQnaList() {
        return qnaMapper.selectQnaList();
    }

    /**
     * 질문 상세 조회
     * - 조회 시 조회수를 1 증가시킴 (DB 반영 + 반환 객체에도 반영)
     * @param qnaId 조회할 질문 ID
     * @return 질문 상세 정보
     * @throws IllegalArgumentException 해당 ID의 질문이 존재하지 않을 경우
     */
    public QnaDTO getQnaDetail(int qnaId) {
        QnaDTO qna = qnaMapper.selectQnaById(qnaId);
        if (qna == null) {
            throw new IllegalArgumentException("존재하지 않는 질문입니다. qnaId=" + qnaId);
        }
        qnaMapper.increaseQnaHit(qnaId); // DB 상의 조회수 증가
        qna.setQnaHit(qna.getQnaHit() + 1); // 반환할 객체에도 증가된 조회수 반영
        return qna;
    }

    /**
     * 질문 등록
     * - 비밀글 여부 값을 프론트에서 넘어온 'Y'/그 외 값 기준으로 DB ENUM 값("비밀"/"공개")으로 변환 후 저장
     * @param qnaDTO 등록할 질문 정보
     */
    public void createQna(QnaDTO qnaDTO) {
        // 1. 'Y'이면 '비밀', 아니면 '공개'로 변환 (DB의 ENUM 값과 일치시키기 위함)
        String inputSecret = qnaDTO.getQnaIsSecret();
        String finalSecret = "Y".equals(inputSecret) ? "비밀" : "공개";

        // 2. 변환된 값을 DTO에 다시 저장
        qnaDTO.setQnaIsSecret(finalSecret);

        // 3. 매퍼 호출
        qnaMapper.insertQna(qnaDTO);
    }

    /**
     * 질문 수정
     * - 수정 전 대상 질문이 실제로 존재하는지 확인
     * @param qnaDTO 수정할 질문 정보 (qnaId 포함)
     * @throws IllegalArgumentException 해당 ID의 질문이 존재하지 않을 경우
     */
    public void updateQna(QnaDTO qnaDTO) {
        QnaDTO existing = qnaMapper.selectQnaById(qnaDTO.getQnaId());
        if (existing == null) {
            throw new IllegalArgumentException("존재하지 않는 질문입니다. qnaId=" + qnaDTO.getQnaId());
        }
        qnaMapper.updateQna(qnaDTO);
    }

    /**
     * 질문 삭제
     * - 존재 여부 체크 없이 바로 삭제 시도 (다른 메서드들과 달리 사전 검증 로직 없음)
     * @param qnaId 삭제할 질문 ID
     */
    public void deleteQna(int qnaId) {
        qnaMapper.deleteQna(qnaId);
    }
}
