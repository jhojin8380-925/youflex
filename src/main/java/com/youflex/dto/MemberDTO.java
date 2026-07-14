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

    // 실제 DB에는 member_role이 따로 없고 이 memberGrade가 권한 역할까지 겸함
    // (ENUM '일반'/'우수'/'관리자', 기본값 '일반'). 관리자 판별은 == '관리자'로 비교.
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
