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
public class ChatMemberDTO {
    private int chatMemberId;
    private int memberId;
    private int chatroomId;
    private String chatMemberRole;
    private String chatMemberStatus;
}
