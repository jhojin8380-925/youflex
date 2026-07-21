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

    // 관리자 - 처리완료 탭에서 신고 기록 자체를 완전 삭제(원본 QNA와는 무관)
    void deleteQnaReport(int qnaReportId);
}
