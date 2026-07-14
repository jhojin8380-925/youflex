package com.youflex.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberDTO {
    private int memberId;
    private String memberLoginid;
    private String memberPwd;
    private String memberName;
    private String memberEmail;
    private String memberPhone;

    // 권한 구분(USER/ADMIN 등, memberGrade=등급과는 별개). fragments/layout.html의
    // 관리자 메뉴 노출 조건(session.loginMember.memberRole == 'ADMIN')이 이 값을 참조하므로
    // DB member 테이블에 member_role 컬럼이 반드시 있어야 함(없으면 직접 추가 필요).
    private String memberRole;
    private String memberGrade;
    private int memberPoint;
    private String memberDeleteStatus;
    private LocalDateTime memberCreatedAt;
    private LocalDateTime memberDeletedAt;
    private String memberProfileImg;
    private String memberGradeStatus;

    // join 조회용 (DB 컬럼 아님)
    private int warningCount;
}
