package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.youflex.dto.GenreCategoryDTO;

@Mapper
public interface GenreCategoryMapper {

    // 회원가입 시 취향 선택 모달에 뿌려줄 전체 장르 목록
    List<GenreCategoryDTO> findAll();
}
