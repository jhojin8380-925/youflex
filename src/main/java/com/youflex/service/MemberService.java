package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.youflex.dto.MemberDTO;
import com.youflex.mapper.MemberMapper;
import com.youflex.mapper.PreferenceMappingMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemberService {

    private static final int MAX_GENRE_PREFERENCES = 3;

    private final MemberMapper memberMapper;
    private final PreferenceMappingMapper preferenceMappingMapper;

    // 회원가입 아이디 중복확인(/join/check-id)과 가입 처리(join) 양쪽에서 사용
    public boolean isLoginIdTaken(String memberLoginid) {
        return memberMapper.findByLoginId(memberLoginid) != null;
    }

    // 비밀번호를 해시 없이 평문 그대로 비교(요청에 따라 해시 제거함 - 보안상 실서비스에는 부적합)
    public MemberDTO login(String memberLoginid, String rawPwd) {
        MemberDTO member = memberMapper.findByLoginId(memberLoginid);
        if (member == null || !rawPwd.equals(member.getMemberPwd())) {
            return null;
        }
        return member;
    }

    public void join(MemberDTO memberDTO, List<Integer> genreCategoryIds) {
        // 해시 없이 입력한 비밀번호를 그대로 저장(요청에 따라 해시 제거함 - 보안상 실서비스에는 부적합)
        // 폼으로 넘어온 값과 무관하게 항상 일반회원으로 고정(관리자 자가 승격 방지).
        // DB에는 member_role이 따로 없고 member_grade(ENUM '일반'/'우수'/'관리자')가 그 역할을 함.
        memberDTO.setMemberGrade("일반");
        memberMapper.insertMember(memberDTO); // useGeneratedKeys로 memberDTO.memberId가 채워짐

        if (genreCategoryIds == null || genreCategoryIds.isEmpty()) {
            return;
        }
        // 취향 선택은 최대 3개까지만 허용(클라이언트에서도 막지만 서버에서도 한 번 더 자름)
        List<Integer> limited = genreCategoryIds.size() > MAX_GENRE_PREFERENCES
                ? genreCategoryIds.subList(0, MAX_GENRE_PREFERENCES)
                : genreCategoryIds;
        preferenceMappingMapper.insertPreferences(memberDTO.getMemberId(), limited);
    }
}
