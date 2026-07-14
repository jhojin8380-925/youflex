package com.youflex.service;

import java.util.List;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import com.youflex.dto.QnaCommentReportDTO;
import com.youflex.mapper.QnaCommentReportMapper;

@Service
@RequiredArgsConstructor
public class QnaCommentReportServiceImpl implements QnaCommentReportService {

    private final QnaCommentReportMapper qnaCommentReportMapper;

    @Override
    public void reportComment(QnaCommentReportDTO reportDTO) {
        qnaCommentReportMapper.insertCommentReport(reportDTO);
    }

    @Override
    public List<QnaCommentReportDTO> getReportList() {
        return qnaCommentReportMapper.selectCommentReportList();
    }

    @Override
    public void processReport(int qnaCommentReportId, String status) {
        qnaCommentReportMapper.updateCommentReportStatus(qnaCommentReportId, status);
    }
}
