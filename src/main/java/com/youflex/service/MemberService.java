package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.MemberDTO;
import com.youflex.dto.MemberSocialDTO;
import com.youflex.dto.PageInfo;
import com.youflex.mapper.MemberMapper;
import com.youflex.mapper.MemberMappingMapper;
import com.youflex.mapper.MemberSocialMapper;
import com.youflex.mapper.ReviewLikeMapper;
import com.youflex.mapper.ReviewMapper;
import com.youflex.mapper.admin.WarningMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemberService {

    private static final int MAX_GENRE_PREFERENCES = 3;

    // 등업 신청 조건 (project-plan.md 참고: 게시글 3회 / 유효경고 0회 / 좋아요 총합 100회)
    private static final int GRADE_UPGRADE_MIN_REVIEWS = 3;
    private static final int GRADE_UPGRADE_MAX_WARNINGS = 0;
    private static final int GRADE_UPGRADE_MIN_LIKES = 100;

    private final MemberMapper memberMapper;
    private final MemberMappingMapper preferenceMappingMapper;
    private final MemberSocialMapper memberSocialMapper;
    private final ReviewMapper reviewMapper;
    private final ReviewLikeMapper reviewLikeMapper;
    private final WarningMapper warningMapper;

    // 회원가입 아이디 중복확인(/join/check-id)과 가입 처리(join) 양쪽에서 사용
    public boolean isLoginIdTaken(String memberLoginid) {
        return memberMapper.findByLoginId(memberLoginid) != null;
    }

    // 이메일 중복확인(/join/check-email, 회원가입/마이페이지 저장 시 서버 재검증) - member_email UNIQUE 제약 대응
    public boolean isEmailTaken(String memberEmail) {
        return memberMapper.findByEmail(memberEmail) != null;
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
        // 폼으로 넘어온 값과 무관하게 항상 일반회원(시청자)으로 고정(관리자 자가 승격 방지).
        // DB에는 member_role이 따로 없고 member_grade(ENUM '시청자'/'평론가'/'관리자')가 그 역할을 함.
        memberDTO.setMemberGrade("시청자");
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

    // 소셜로그인(카카오/구글) - (제공자, 소셜 고유키)로 이미 연결된 회원이 있으면 그대로 로그인시키고,
    // 없으면 이메일이 같은 기존(일반가입) 회원에 소셜 계정만 추가로 연결하며, 그마저 없으면 신규 회원을
    // 만들어서 연결한다. member_loginid/member_pwd는 null로 남음(소셜 전용 계정 - database-schema.md 참고).
    @Transactional
    public MemberDTO loginOrRegisterSocial(String socialType, String socialKey, String email, String name) {
        Integer existingMemberId = memberSocialMapper.findMemberIdByTypeAndKey(socialType, socialKey);
        if (existingMemberId != null) {
            return memberMapper.findById(existingMemberId);
        }

        MemberDTO member = memberMapper.findByEmail(email);
        if (member == null) {
            member = MemberDTO.builder()
                    .memberName(name)
                    .memberEmail(email)
                    .memberGrade("시청자")
                    .build();
            memberMapper.insertMember(member); // useGeneratedKeys로 memberDTO.memberId가 채워짐
        }

        memberSocialMapper.insertMemberSocial(MemberSocialDTO.builder()
                .memberId(member.getMemberId())
                .memberSocialType(socialType)
                .memberSocialKey(socialKey)
                .build());
        return member;
    }

    // ===================== 마이페이지 - 내 정보 =====================

    // 내 정보 탭 조회(누적 경고 횟수 포함)
    public MemberDTO getMemberDetail(int memberId) {
        return memberMapper.findById(memberId);
    }

    // 회원정보 수정 전 현재 비밀번호 확인
    public boolean isCurrentPasswordValid(int memberId, String currentPwd) {
        MemberDTO member = memberMapper.findById(memberId);
        return currentPwd.equals(member.getMemberPwd());
    }

    // 회원정보 수정 - 새 비밀번호를 입력하지 않았으면 기존 비밀번호를, 새 프로필 이미지를 첨부하지 않았으면
    // 기존 이미지를 그대로 유지
    public void updateProfile(int memberId, String newPwd, MemberDTO updates) {
        MemberDTO member = memberMapper.findById(memberId);
        updates.setMemberId(memberId);
        updates.setMemberPwd(newPwd != null && !newPwd.isBlank() ? newPwd : member.getMemberPwd());
        if (updates.getMemberProfileImg() == null || updates.getMemberProfileImg().isBlank()) {
            updates.setMemberProfileImg(member.getMemberProfileImg());
        }
        memberMapper.updateProfile(updates);
    }

    // 취향 선택 모달의 초기 체크 표시용 - 현재 선택되어 있는 장르 id 목록 조회
    public List<Integer> getMemberGenreCategoryIds(int memberId) {
        return preferenceMappingMapper.selectGenreCategoryIdsByMemberId(memberId);
    }

    // 마이페이지 - 등업신청 버튼. 게시글 3회 이상 / 유효경고 0회 / 본인 게시글 좋아요 총합 100회 이상을
    // 모두 만족해야 접수되며, 승인/반려는 관리자가 수동으로 처리(등업신청 관리 화면).
    public void requestGradeUpgrade(int memberId) {
        int reviewCount = reviewMapper.countByMemberId(memberId);
        if (reviewCount < GRADE_UPGRADE_MIN_REVIEWS) {
            throw new IllegalStateException(
                    "게시글을 " + GRADE_UPGRADE_MIN_REVIEWS + "회 이상 작성해야 등업 신청이 가능합니다. (현재 " + reviewCount + "회)");
        }
        int warningCount = warningMapper.countActiveWarnings(memberId);
        if (warningCount > GRADE_UPGRADE_MAX_WARNINGS) {
            throw new IllegalStateException("유효한 경고가 없어야 등업 신청이 가능합니다. (현재 " + warningCount + "회)");
        }
        int likeCount = reviewLikeMapper.countTotalLikesByAuthor(memberId);
        if (likeCount < GRADE_UPGRADE_MIN_LIKES) {
            throw new IllegalStateException(
                    "본인 게시글이 받은 좋아요가 총 " + GRADE_UPGRADE_MIN_LIKES + "회 이상이어야 등업 신청이 가능합니다. (현재 " + likeCount + "회)");
        }
        memberMapper.requestGradeUpgrade(memberId);
    }

    // 취향 장르 변경 - 기존 선택을 전부 지우고 이번에 고른 것만 다시 저장(교체 방식)
    public void updateGenrePreferences(int memberId, List<Integer> genreCategoryIds) {
        preferenceMappingMapper.deletePreferencesByMemberId(memberId);
        if (genreCategoryIds == null || genreCategoryIds.isEmpty()) {
            return;
        }
        List<Integer> limited = genreCategoryIds.size() > MAX_GENRE_PREFERENCES
                ? genreCategoryIds.subList(0, MAX_GENRE_PREFERENCES)
                : genreCategoryIds;
        preferenceMappingMapper.insertPreferences(memberId, limited);
    }

    // 마이페이지 - 탈퇴신청 버튼. 관리자 강제탈퇴(forceWithdraw)와 동일한 소프트 삭제라 그 매퍼를 그대로 재사용함.
    // 최종 승인(완전삭제)/반려(복구)는 관리자가 탈퇴신청 관리 화면에서 나중에 처리.
    public void requestWithdraw(int memberId) {
        memberMapper.forceWithdraw(memberId);
    }

    // ===================== 관리자 - 회원 관리 =====================

    private static final int MEMBER_PAGE_SIZE = 5;

    // 회원 목록(정상 회원) 검색 + 페이징 조회. page는 1부터 시작.
    public List<MemberDTO> getMemberList(String keyword, int page) {
        int offset = PageInfo.of(page, MEMBER_PAGE_SIZE, 0).getOffset();
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

    // 탈퇴 승인 - 완전삭제 전에 통계용 이력을 먼저 남기고(회원 row가 지워지면 이름을 알 수 없으므로),
    // 계정과 작성글/댓글을 완전히 삭제(FK ON DELETE CASCADE, 되돌릴 수 없음)
    @Transactional
    public void approveWithdraw(int memberId) {
        MemberDTO member = memberMapper.findById(memberId);
        memberMapper.insertWithdrawalLog(memberId, member.getMemberName());
        memberMapper.deleteMemberPermanently(memberId);
    }
}
