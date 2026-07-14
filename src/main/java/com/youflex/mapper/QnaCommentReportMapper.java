package com.youflex.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.youflex.dto.QnaCommentReportDTO;

@Mapper
public interface QnaCommentReportMapper {
    void insertCommentReport(QnaCommentReportDTO reportDTO);
    List<QnaCommentReportDTO> selectCommentReportList();
    void updateCommentReportStatus(@Param("qnaCommentReportId") int qnaCommentReportId,
                                    @Param("qnaCommentReportStatus") String qnaCommentReportStatus);
}
