package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;
import com.youflex.dto.AdminAnswerDTO;

@Mapper
public interface AdminAnswerMapper {
    AdminAnswerDTO selectAnswerByQnaId(int qnaId);
    void insertAnswer(AdminAnswerDTO answerDTO);
    void updateAnswer(AdminAnswerDTO answerDTO);
    void deleteAnswer(int adminAnswerId);
}
