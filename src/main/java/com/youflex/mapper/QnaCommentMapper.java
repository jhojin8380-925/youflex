package com.youflex.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.youflex.dto.QnaCommentDTO;

@Mapper
public interface QnaCommentMapper {
    List<QnaCommentDTO> selectCommentsByQnaId(int qnaId);
    void insertComment(QnaCommentDTO commentDTO);
    QnaCommentDTO selectCommentById(int qnaCommentId);
    void deleteComment(int qnaCommentId);
}
