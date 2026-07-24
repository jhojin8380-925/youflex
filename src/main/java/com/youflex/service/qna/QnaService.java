package com.youflex.service.qna;

import java.util.List;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.qna.QnaDTO;
import com.youflex.mapper.qna.QnaMapper;
import com.youflex.service.BadWordService;

/**
 * Q&A(질문) 관련 비즈니스 로직
 * - 질문 목록/상세 조회, 등록, 수정, 삭제 및 상태 변경(답변완료 처리) 담당
 */
@Service
@RequiredArgsConstructor
public class QnaService {

    private final QnaMapper qnaMapper;
    private final BadWordService badWordService;

    /**
     * 전체 질문 목록 조회
     * @return 질문 리스트
     */
    public List<QnaDTO> getQnaList() {
        return qnaMapper.selectQnaList();
    }

    /**
     * 질문 상세 조회 (항상 조회수 증가)
     * @param qnaId 조회할 질문 ID
     * @param requesterMemberId 조회를 요청한 회원 ID (비로그인이면 null)
     * @param isAdmin 요청자가 관리자 등급인지 여부
     * @return 질문 상세 정보
     * @throws IllegalArgumentException 해당 ID의 질문이 존재하지 않을 경우
     * @throws IllegalStateException 비밀글인데 작성자 본인도 관리자도 아닐 경우
     */
    public QnaDTO getQnaDetail(int qnaId, Integer requesterMemberId, boolean isAdmin) {
        return getQnaDetail(qnaId, requesterMemberId, isAdmin, true);
    }

    /**
     * 질문 상세 조회
     * - 비밀글(qnaIsSecret == "비밀")인 경우 작성자 본인 또는 관리자만 조회 가능
     * - increaseHit이 true일 때만 조회수를 1 증가시킴 (DB 반영 + 반환 객체에도 반영). 접근 거부 시에는 증가시키지 않음
     * - 같은 세션의 F5 새로고침/댓글 작성 후 재조회, 수정 폼 진입 등 중복 호출 시에는 호출부(Controller)에서
     *   increaseHit을 false로 넘겨 조회수가 무한정 올라가지 않도록 함
     * @param qnaId 조회할 질문 ID
     * @param requesterMemberId 조회를 요청한 회원 ID (비로그인이면 null)
     * @param isAdmin 요청자가 관리자 등급인지 여부
     * @param increaseHit 조회수 증가 여부
     * @return 질문 상세 정보
     * @throws IllegalArgumentException 해당 ID의 질문이 존재하지 않을 경우
     * @throws IllegalStateException 비밀글인데 작성자 본인도 관리자도 아닐 경우
     */
    public QnaDTO getQnaDetail(int qnaId, Integer requesterMemberId, boolean isAdmin, boolean increaseHit) {
        QnaDTO qna = qnaMapper.selectQnaById(qnaId);
        if (qna == null) {
            throw new IllegalArgumentException("존재하지 않는 질문입니다. qnaId=" + qnaId);
        }
        boolean isOwner = requesterMemberId != null && requesterMemberId == qna.getMemberId();
        if ("비밀".equals(qna.getQnaIsSecret()) && !isOwner && !isAdmin) {
            throw new IllegalStateException("비공개 질문입니다. qnaId=" + qnaId);
        }
        if (increaseHit) {
            qnaMapper.increaseQnaHit(qnaId); // DB 상의 조회수 증가
            qna.setQnaHit(qna.getQnaHit() + 1); // 반환할 객체에도 증가된 조회수 반영
        }
        return qna;
    }

    /**
     * 질문 등록
     * - 비밀글 여부 값을 프론트에서 넘어온 'Y'/그 외 값 기준으로 DB ENUM 값("비밀"/"공개")으로 변환 후 저장
     * @param qnaDTO 등록할 질문 정보
     */
    public void createQna(QnaDTO qnaDTO) {
        // 금칙어가 포함되어 있으면 등록 자체를 막음 (제목/본문 모두 검사)
        badWordService.validateContent(qnaDTO.getQnaTitle());
        badWordService.validateContent(qnaDTO.getQnaContent());
        qnaDTO.setQnaIsSecret(normalizeSecret(qnaDTO.getQnaIsSecret()));
        qnaMapper.insertQna(qnaDTO);
    }

    /**
     * 질문 수정
     * - 수정 전 대상 질문이 실제로 존재하는지, 요청자가 작성자 본인인지 확인
     * - 비밀글 여부 값을 등록과 동일한 규칙으로 DB ENUM 값으로 변환 후 저장
     * @param qnaDTO 수정할 질문 정보 (qnaId 포함)
     * @param requesterMemberId 수정을 요청한 회원 ID
     * @throws IllegalArgumentException 해당 ID의 질문이 존재하지 않을 경우
     * @throws IllegalStateException 요청자가 작성자 본인이 아닐 경우
     */
    public void updateQna(QnaDTO qnaDTO, int requesterMemberId) {
        QnaDTO existing = qnaMapper.selectQnaById(qnaDTO.getQnaId());
        if (existing == null) {
            throw new IllegalArgumentException("존재하지 않는 질문입니다. qnaId=" + qnaDTO.getQnaId());
        }
        if (existing.getMemberId() != requesterMemberId) {
            throw new IllegalStateException("수정 권한이 없습니다.");
        }
        // 금칙어가 포함되어 있으면 수정도 막음 (필터 우회 방지, 제목/본문 모두 검사)
        badWordService.validateContent(qnaDTO.getQnaTitle());
        badWordService.validateContent(qnaDTO.getQnaContent());
        qnaDTO.setQnaIsSecret(normalizeSecret(qnaDTO.getQnaIsSecret()));
        qnaMapper.updateQna(qnaDTO);
    }

    // 'Y'이면 '비밀', 그 외(N 포함)는 '공개'로 변환 (프론트 라디오 값 -> DB ENUM 값)
    private String normalizeSecret(String inputSecret) {
        return "Y".equals(inputSecret) ? "비밀" : "공개";
    }

    /**
     * 질문 삭제 - 작성자 본인만 가능 (하드 삭제, FK CASCADE로 댓글/관리자답변까지 함께 삭제됨)
     * @param qnaId 삭제할 질문 ID
     * @param requesterMemberId 삭제를 요청한 회원 ID
     * @throws IllegalArgumentException 해당 ID의 질문이 존재하지 않을 경우
     * @throws IllegalStateException 요청자가 작성자 본인이 아닐 경우
     */
    public void deleteQna(int qnaId, int requesterMemberId) {
        QnaDTO existing = qnaMapper.selectQnaById(qnaId);
        if (existing == null) {
            throw new IllegalArgumentException("존재하지 않는 질문입니다. qnaId=" + qnaId);
        }
        if (existing.getMemberId() != requesterMemberId) {
            throw new IllegalStateException("삭제 권한이 없습니다.");
        }
        qnaMapper.deleteQna(qnaId);
    }

    /**
     * 질문 삭제 - 관리자 전용, 작성자 본인 여부와 무관하게 삭제 가능 (소유권 체크 없음)
     * @param qnaId 삭제할 질문 ID
     * @throws IllegalArgumentException 해당 ID의 질문이 존재하지 않을 경우
     */
    public void deleteQnaByAdmin(int qnaId) {
        QnaDTO existing = qnaMapper.selectQnaById(qnaId);
        if (existing == null) {
            throw new IllegalArgumentException("존재하지 않는 질문입니다. qnaId=" + qnaId);
        }
        qnaMapper.deleteQna(qnaId);
    }
}
