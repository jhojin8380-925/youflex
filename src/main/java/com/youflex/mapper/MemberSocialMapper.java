package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.MemberSocialDTO;

@Mapper
public interface MemberSocialMapper {

    // 소셜 로그인 - (제공자, 소셜 고유키) 조합으로 이미 연결된 회원번호 조회. 연결된 적 없으면 null.
    Integer findMemberIdByTypeAndKey(@Param("memberSocialType") String memberSocialType,
                                      @Param("memberSocialKey") String memberSocialKey);

    // 소셜 계정과 회원을 연결(신규가입 시 또는 이메일이 같은 기존 회원에 추가 연결할 때)
    void insertMemberSocial(MemberSocialDTO memberSocialDTO);
}
