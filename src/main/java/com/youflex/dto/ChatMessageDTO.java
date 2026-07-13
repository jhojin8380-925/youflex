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
public class ChatMessageDTO {
    private int chatMessageId;
    private int chatroomId;
    private int memberId;
    private String chatMessageContent;
    private LocalDateTime chatMessageCreatedAt;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
}
