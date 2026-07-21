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

    // 관리자 - 처리완료 탭에서 신고 기록 자체를 완전 삭제(원본 QNA댓글과는 무관)
    void deleteQnaCommentReport(int qnaCommentReportId);
}
