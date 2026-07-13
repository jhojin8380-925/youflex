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
public class ChatWarningDTO {
    private int chatWarningId;
    private int memberId;
    private int chatroomId;
    private int chatMessageId;
    private String chatWarningReason;
    private LocalDateTime chatWarningCreatedAt;

    // join 조회용 (DB 컬럼 아님)
    private String memberName;
}
