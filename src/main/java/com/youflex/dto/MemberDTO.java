package com.youflex.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

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

    // 관리자 API(/api/admin/members 등)에서 MemberDTO를 그대로 JSON으로 내려보내므로,
    // 평문 저장된 비밀번호가 응답에 노출되지 않도록 직렬화에서 제외.
    @JsonIgnore // "이 필드는 JSON으로 변환할 때 제외해"라고 알려주는 어노테이션
    private String memberPwd;
    private String memberName;
    private String memberEmail;
    private String memberPhone;

    // 실제 DB에는 member_role이 따로 없고 이 memberGrade가 권한 역할까지 겸함
    // (ENUM '시청자'/'평론가'/'관리자', 기본값 '시청자'). 관리자 판별은 == '관리자'로 비교.
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
