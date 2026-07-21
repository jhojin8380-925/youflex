package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ChatMemberMapper {

    /**
     * 채팅방 참여 기록 추가
     * @param chatMemberRole   "방장" 또는 "참여자" (DB enum 값과 정확히 일치해야 함)
     * @param chatMemberStatus "참여중" (DB enum 값과 정확히 일치해야 함)
     */
    int insertChatMember(@Param("memberId") int memberId,
                          @Param("chatroomId") int chatroomId,
                          @Param("chatMemberRole") String chatMemberRole,
                          @Param("chatMemberStatus") String chatMemberStatus);

    /**
     * 특정 회원의 특정 방 내 역할 조회
     * @return "방장" / "참여자", 참여 기록이 없으면 null
     */
    String selectChatMemberRole(@Param("chatroomId") int chatroomId,
                                 @Param("memberId") int memberId);

    /** 방 삭제 시 해당 방의 모든 참여 기록 정리 */
    int deleteAllChatMembersByChatroomId(int chatroomId);

    /** 특정 회원의 참여 기록 삭제 (나가기) */
    int deleteChatMember(@Param("chatroomId") int chatroomId,
                          @Param("memberId") int memberId);
}