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
public class NoticeDTO {
    private int noticeId;
    private String noticeTitle;
    private String noticeContent;
    private String noticeCreatedAt;
    private String noticeUpdatedAt;
}
