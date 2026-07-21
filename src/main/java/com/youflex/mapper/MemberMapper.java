package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.MemberDTO;


@Mapper
public interface MemberMapper {

    // 로그인 검증 + 아이디 중복확인(로그인/회원가입)에서 공용으로 사용
    MemberDTO findByLoginId(String memberLoginid);

    // 회원가입 저장 (비밀번호는 서비스단에서 이미 해시된 값)
    int insertMember(MemberDTO memberDTO);

    // 관리자 - 회원번호로 단건 조회(액션 처리 전 존재 확인용) / 마이페이지 내 정보 조회에도 사용
    MemberDTO findById(int memberId);

    // 마이페이지 - 회원정보 수정(이름/이메일/전화번호/비밀번호)
    void updateProfile(MemberDTO memberDTO);

    // 관리자 - 회원 목록(정상 회원만) 검색 + 페이징. keyword는 아이디/이름/이메일 부분일치.
    List<MemberDTO> findMembers(@Param("keyword") String keyword,
                                 @Param("offset") int offset,
                                 @Param("size") int size);

    // 회원 목록 검색결과 총 개수(페이지네이션 계산용)
    int countMembers(@Param("keyword") String keyword);

    // 마이페이지 - 등업신청 버튼 클릭 시 상태를 '신청'으로 전환(관리자 등업신청 관리 화면에 노출됨)
    void requestGradeUpgrade(int memberId);

    // 관리자 - 등업(우수회원) 신청 대기 목록
    List<MemberDTO> findGradeUpgradeRequests();

    // 관리자 - 탈퇴(자진/강제) 처리되어 최종 삭제를 기다리는 회원 목록
    List<MemberDTO> findWithdrawnMembers();

    // 등업 승인 - 일반 -> 우수로 전환
    void approveGradeUpgrade(int memberId);

    // 등업 반려
    void rejectGradeUpgrade(int memberId);

    // 강제탈퇴 / 자진탈퇴 공용 - 소프트 삭제(member_delete_status = '탈퇴')
    void forceWithdraw(int memberId);

    // 탈퇴 반려 - 소프트 삭제 취소(다시 '정상'으로 복구)
    void restoreMember(int memberId);

    // 탈퇴 승인 - 계정/작성글/댓글 완전 삭제(FK ON DELETE CASCADE로 연쇄 삭제, 되돌릴 수 없음)
    void deleteMemberPermanently(int memberId);

    // 탈퇴 승인 시 회원 row가 완전삭제되어 이력이 안 남으므로, 삭제 직전에 통계용 로그 1행 남김
    // (관리자 대시보드 "누적 탈퇴자수" 집계용)
    void insertWithdrawalLog(@Param("memberId") int memberId, @Param("memberName") String memberName);

    // 포인트 적립/차감 - amount에 음수를 넘기면 차감도 이 메서드로 처리 가능
    void addPoint(@Param("memberId") int memberId, @Param("amount") int amount);
}
