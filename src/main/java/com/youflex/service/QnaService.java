package com.youflex.service;

import java.util.List;

import com.youflex.dto.QnaDTO;

public interface QnaService {
    List<QnaDTO> getQnaList();
    QnaDTO getQnaDetail(int qnaId);
    void createQna(QnaDTO qnaDTO);
    void updateQna(QnaDTO qnaDTO);
    void deleteQna(int qnaId);
    void answerQna(int qnaId); // 상태만 WAIT -> DONE 전환 (답변 내용 컬럼 추가되면 오버로드 예정)
}
