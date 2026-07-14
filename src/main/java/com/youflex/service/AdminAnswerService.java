package com.youflex.service;

import com.youflex.dto.AdminAnswerDTO;

public interface AdminAnswerService {
    AdminAnswerDTO getAnswer(int qnaId);
    // 답변 등록/수정을 하나로 처리 (있으면 update, 없으면 insert) + qna 상태를 DONE으로 변경
    void saveAnswer(int qnaId, String content);
    void deleteAnswer(int adminAnswerId);
}
