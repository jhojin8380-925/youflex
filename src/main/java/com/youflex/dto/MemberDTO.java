package com.youflex.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
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
    private String memberProfileImg;
    private String memberGradeStatus;
}
