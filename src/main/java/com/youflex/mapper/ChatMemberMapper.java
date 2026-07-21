package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.youflex.dto.ChatMemberDTO;

@Mapper // MyBatis 매퍼 인터페이스로 등록 (구현체는 XML 매핑 파일이 대신함)
public interface ChatMemberMapper {

    /**
     * 채팅방 참여자 등록
     * - 방장 자동 입장(createChatroomWithHost) 및 일반 참여자 입장 시 공통으로 사용
     * - chat_member 테이블에 (member_id, chatroom_id) 조합의 UNIQUE 제약이 있어서
     *   이미 참여 중인 회원을 다시 넣으면 DuplicateKeyException 발생
     * - 반환값: DB에 반영된 row 수 (보통 성공 시 1)
     */
    int insertChatMember(ChatMemberDTO chatMember);

    // 특정 회원의 role 조회 ("방장" / "참여자")
    String selectChatMemberRole(@Param("chatroomId") int chatroomId, @Param("memberId") int memberId);

    // 방장 나갈 때: 해당 채팅방의 참여자 전원 삭제
    int deleteAllChatMembersByChatroomId(@Param("chatroomId") int chatroomId);

    // 일반 참여자 나갈 때: 본인 row만 삭제
    int deleteChatMember(@Param("chatroomId") int chatroomId, @Param("memberId") int memberId);
}