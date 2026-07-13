package com.youflex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberSocialDTO {
    private int memberSocialId;
    private int memberId;
    private String memberSocialType;
    private String memberSocialKey;
}
