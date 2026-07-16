package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface PreferenceMappingMapper {

    // 회원가입 시 선택한 관심 장르를 한 번에 저장(member_id, genre_category_id 쌍을 배치 insert)
    int insertPreferences(@Param("memberId") int memberId, @Param("genreCategoryIds") List<Integer> genreCategoryIds);

    // 마이페이지 취향 선택 모달을 열 때 기존에 선택해둔 장르를 체크 표시하기 위해 조회
    List<Integer> selectGenreCategoryIdsByMemberId(@Param("memberId") int memberId);

    // 마이페이지에서 취향 장르를 새로 선택할 때 기존 선택을 통째로 지우기 위해 사용(교체 방식)
    int deletePreferencesByMemberId(@Param("memberId") int memberId);
}
