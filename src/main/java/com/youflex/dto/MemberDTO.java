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
