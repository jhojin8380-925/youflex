package com.youflex.mapper;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.youflex.dto.ChatroomDTO;
@Mapper
public interface ChatroomMapper {
    int createChatroom(ChatroomDTO chatroom);
    ChatroomDTO selectChatroomById(int chatroomId);

    /**
     * 전체 채팅방 목록 조회
     * @param memberId 로그인한 회원 ID (비로그인 시 null) - 각 방의 joined 여부 판단용
     */
    List<ChatroomDTO> selectAllChatrooms(@Param("memberId") Integer memberId);

    int updateChatroom(ChatroomDTO chatroom);
    int deleteChatroom(int chatroomId);
    /**
     * 특정 회원이 개설한 채팅방 개수 조회
     * - 1개 이상이면 이미 개설한 방이 있는 것으로 판단
     */
    int countChatroomByMemberId(int memberId);
}