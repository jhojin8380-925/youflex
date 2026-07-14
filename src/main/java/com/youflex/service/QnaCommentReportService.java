package com.youflex.service;

import java.util.List;
import com.youflex.dto.QnaCommentReportDTO;

public interface QnaCommentReportService {
    void reportComment(QnaCommentReportDTO reportDTO);
    List<QnaCommentReportDTO> getReportList();
    void processReport(int qnaCommentReportId, String status);
}
