package com.youflex.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.youflex.dto.BadWordDTO;

@Mapper
public interface BadWordMapper {

    // 금칙어 목록 조회
    List<BadWordDTO> selectBadWordList();

    // 금칙어 등록
    void insertBadWord(BadWordDTO badWordDTO);

    // 금칙어 삭제
    void deleteBadWord(int badWordId);
}
