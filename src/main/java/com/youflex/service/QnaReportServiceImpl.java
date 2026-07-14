package com.youflex.service;

import java.util.List;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.QnaReportDTO;
import com.youflex.mapper.QnaReportMapper;

@Service
@RequiredArgsConstructor
public class QnaReportServiceImpl implements QnaReportService {

    private final QnaReportMapper qnaReportMapper;

    @Override
    public void reportQna(QnaReportDTO reportDTO) {
        qnaReportMapper.insertQnaReport(reportDTO);
    }

    @Override
    public List<QnaReportDTO> getReportList() {
        return qnaReportMapper.selectQnaReportList();
    }

    @Override
    public void processReport(int qnaReportId, String status) {
        qnaReportMapper.updateQnaReportStatus(qnaReportId, status);
    }
}
