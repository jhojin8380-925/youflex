package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface PreferenceMappingMapper {

    // 회원가입 시 선택한 관심 장르를 한 번에 저장(member_id, genre_category_id 쌍을 배치 insert)
    int insertPreferences(@Param("memberId") int memberId, @Param("genreCategoryIds") List<Integer> genreCategoryIds);
}
