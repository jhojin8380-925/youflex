package com.youflex.dto;

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
public class MemberSocialDTO {
    private int memberSocialId;
    private int memberId;
    private String memberSocialType;
    private String memberSocialKey;
}
