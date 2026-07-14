package com.youflex.service;

import org.springframework.stereotype.Service;

import com.youflex.dto.MemberDTO;
import com.youflex.mapper.MemberMapper;
import com.youflex.util.PasswordUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberMapper memberMapper;

    // 회원가입 아이디 중복확인(/join/check-id)과 가입 처리(join) 양쪽에서 사용
    public boolean isLoginIdTaken(String memberLoginid) {
        return memberMapper.findByLoginId(memberLoginid) != null;
    }

    // 아이디로 조회한 회원의 해시된 비밀번호와 입력값을 matches()로 비교(단순 equals 불가)
    public MemberDTO login(String memberLoginid, String rawPwd) {
        MemberDTO member = memberMapper.findByLoginId(memberLoginid);
        if (member == null || !PasswordUtil.matches(rawPwd, member.getMemberPwd())) {
            return null;
        }
        return member;
    }

    public void join(MemberDTO memberDTO) {
        // 평문 비밀번호를 해시로 치환한 뒤에만 저장
        memberDTO.setMemberPwd(PasswordUtil.encode(memberDTO.getMemberPwd()));
        // 폼으로 넘어온 값과 무관하게 항상 일반회원으로 고정(관리자 자가 승격 방지)
        memberDTO.setMemberRole("USER");
        memberMapper.insertMember(memberDTO);
    }
}
