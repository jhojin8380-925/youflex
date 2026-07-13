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
public class NoticeDTO {
    private int noticeId;
    private String noticeTitle;
    private String noticeContent;
    private LocalDateTime noticeCreatedAt;
    private LocalDateTime noticeUpdatedAt;
}
