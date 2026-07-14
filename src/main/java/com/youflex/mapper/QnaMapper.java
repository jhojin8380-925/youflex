package com.youflex.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.youflex.dto.QnaDTO;

@Mapper
public interface QnaMapper {
    List<QnaDTO> selectQnaList();
    QnaDTO selectQnaById(int qnaId);
    void increaseQnaHit(int qnaId);
    void insertQna(QnaDTO qnaDTO);
    void updateQna(QnaDTO qnaDTO);
    void updateQnaStatus(@Param("qnaId") int qnaId, @Param("qnaStatus") String qnaStatus);
    void deleteQna(int qnaId);
}
