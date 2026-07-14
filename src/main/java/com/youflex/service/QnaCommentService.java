package com.youflex.service;

import java.util.List;
import com.youflex.dto.QnaCommentDTO;

public interface QnaCommentService {
    List<QnaCommentDTO> getComments(int qnaId);
    void addComment(QnaCommentDTO commentDTO);
    void deleteComment(int qnaCommentId, int requesterMemberId);
}
