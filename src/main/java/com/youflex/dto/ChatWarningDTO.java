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
public class ChatWarningDTO {
    private int chatWarningId;
    private int memberId;
    private int chatroomId;
    private int chatMessageId;
    private String chatWarningReason;
    private String chatWarningCreatedAt;
}
