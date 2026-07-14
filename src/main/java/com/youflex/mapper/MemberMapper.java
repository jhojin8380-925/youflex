package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.youflex.dto.MemberDTO;

@Mapper
public interface MemberMapper {

    // 로그인 검증 + 아이디 중복확인(로그인/회원가입)에서 공용으로 사용
    MemberDTO findByLoginId(String memberLoginid);

    // 회원가입 저장 (비밀번호는 서비스단에서 이미 해시된 값)
    int insertMember(MemberDTO memberDTO);
}
