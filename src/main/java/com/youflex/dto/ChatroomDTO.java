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
public class ChatroomDTO {
    private int chatroomId;
    private int memberId;
    private String chatroomTitle;
    private int chatroomMaxMember;
    private LocalDateTime chatroomCreatedAt;
}
