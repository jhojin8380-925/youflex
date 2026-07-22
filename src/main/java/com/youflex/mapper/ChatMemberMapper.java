package com.youflex.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.youflex.dto.ChatMemberDTO;

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

 // int 타입으로 변경
    int countActiveChatMemberByMemberId(int memberId);
    
 // ChatMemberMapper.java (인터페이스)
    Integer selectActiveChatroomIdByMemberId(int memberId); // Integer로 변경

	int countMembersInChatroom(int chatroomId);

    /**
     * 특정 회원의 채팅방 참여 상태를 '강퇴'로 변경 (물리 삭제 대신 소프트 처리)
     * - 경고 누적으로 강제퇴장 시 사용
     */
    int updateStatusToKicked(@Param("chatroomId") int chatroomId,
                              @Param("memberId") int memberId);

    /**
     * 특정 회원이 해당 채팅방에서 강퇴당한 이력이 있는지 확인
     * @return 강퇴 이력이 있으면 1 이상, 없으면 0
     */
    int isKickedFromChatroom(@Param("chatroomId") int chatroomId,
                              @Param("memberId") int memberId);

    /**
     * 특정 채팅방의 현재 참여자 목록 조회 (방장이 상단에 위치하도록 정렬)
     */
    List<ChatMemberDTO> selectMembersByChatroomId(int chatroomId);
}