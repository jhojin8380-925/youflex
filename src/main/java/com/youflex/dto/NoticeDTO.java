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
public class NoticeDTO {
    private int noticeId;
    private String noticeTitle;
    private String noticeContent;
    private int noticeHit;
    private LocalDateTime noticeCreatedAt;
    private LocalDateTime noticeUpdatedAt;
}
