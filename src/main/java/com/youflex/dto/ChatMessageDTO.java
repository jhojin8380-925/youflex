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
public class ChatMessageDTO {
    private int chatMessageId;
    private int chatroomId;
    private int memberId;
    private String chatMessageContent;
    private String chatMessageCreatedAt;
}
