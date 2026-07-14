package com.youflex.service;

import java.util.List;
import com.youflex.dto.QnaReportDTO;

public interface QnaReportService {
    void reportQna(QnaReportDTO reportDTO);
    List<QnaReportDTO> getReportList();
    void processReport(int qnaReportId, String status);
}
