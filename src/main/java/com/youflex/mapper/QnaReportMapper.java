package com.youflex.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.youflex.dto.QnaReportDTO;

@Mapper
public interface QnaReportMapper {
    void insertQnaReport(QnaReportDTO reportDTO);
    List<QnaReportDTO> selectQnaReportList();
    void updateQnaReportStatus(@Param("qnaReportId") int qnaReportId, @Param("qnaReportStatus") String qnaReportStatus);
}
