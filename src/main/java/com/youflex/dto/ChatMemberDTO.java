package com.youflex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMemberDTO {
    private int chatMemberId;
    private int memberId;
    private int chatroomId;
    private String chatMemberRole;
    private String chatMemberStatus;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
}
