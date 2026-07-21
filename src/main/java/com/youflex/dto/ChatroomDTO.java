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
public class ChatroomDTO {
    private int chatroomId;
    private int memberId;
    private String chatroomTitle;
    private int chatroomMaxMember;
    private LocalDateTime chatroomCreatedAt;
    // join 조회용 (DB 컬럼 아님)
    private String memberName;
    private int currentMemberCount;
    private boolean joined; // ★ 추가: 로그인한 회원이 이 방에 참여 중인지 여부
}