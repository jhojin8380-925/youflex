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

    // ===================== 관리자 - 회원 관리 =====================

    private static final int MEMBER_PAGE_SIZE = 5;

    // 회원 목록(정상 회원) 검색 + 페이징 조회. page는 1부터 시작.
    public List<MemberDTO> getMemberList(String keyword, int page) {
        int safePage = Math.max(page, 1);
        int offset = (safePage - 1) * MEMBER_PAGE_SIZE;
        return memberMapper.findMembers(keyword, offset, MEMBER_PAGE_SIZE);
    }

    public int getMemberListTotalCount(String keyword) {
        return memberMapper.countMembers(keyword);
    }

    public int getMemberPageSize() {
        return MEMBER_PAGE_SIZE;
    }

    // 등업 신청 대기 목록
    public List<MemberDTO> getGradeUpgradeRequests() {
        return memberMapper.findGradeUpgradeRequests();
    }

    // 탈퇴(자진/강제) 처리되어 최종 삭제를 기다리는 회원 목록
    public List<MemberDTO> getWithdrawnMembers() {
        return memberMapper.findWithdrawnMembers();
    }

    public void approveGradeUpgrade(int memberId) {
        memberMapper.approveGradeUpgrade(memberId);
    }

    public void rejectGradeUpgrade(int memberId) {
        memberMapper.rejectGradeUpgrade(memberId);
    }

    // 관리자 강제탈퇴(회원 목록 탭) - 자진탈퇴와 동일하게 소프트 삭제 처리 후 탈퇴 대기 목록으로 이동
    public void forceWithdraw(int memberId) {
        memberMapper.forceWithdraw(memberId);
    }

    // 탈퇴 반려 - 소프트 삭제를 취소하고 회원을 정상 상태로 복구
    public void rejectWithdraw(int memberId) {
        memberMapper.restoreMember(memberId);
    }

    // 탈퇴 승인 - 계정과 작성글/댓글을 완전히 삭제(FK ON DELETE CASCADE, 되돌릴 수 없음)
    public void approveWithdraw(int memberId) {
        memberMapper.deleteMemberPermanently(memberId);
    }
}
