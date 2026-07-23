package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.NotificationsDTO;

@Mapper
public interface NotificationsMapper {

    // 알림 등록 (헤더: 경고/댓글/QNA답변, 채팅방: 입장/퇴장/경고/강퇴 - notificationsTargetType으로 구분)
    void insertNotification(NotificationsDTO notificationsDTO);

    // 헤더 🔔 알림 패널 초기 로드 (채팅방 전용 알림은 제외)
    List<NotificationsDTO> selectByMemberId(@Param("memberId") int memberId);

    // 헤더 알림 패널을 열었을 때 안읽음 알림을 전부 읽음 처리
    void markAllRead(@Param("memberId") int memberId);

    // 개별 삭제(✕ 버튼) - 본인 알림만 삭제되도록 memberId로 범위 제한 (헤더/채팅방 공통)
    void deleteNotification(@Param("notificationsId") int notificationsId, @Param("memberId") int memberId);

    // 헤더 알림 전체 삭제 버튼 (채팅방 전용 알림은 제외)
    void deleteAllByMemberId(@Param("memberId") int memberId);

    // 채팅방 전용 🔔 알림 패널 초기 로드 (입장/퇴장/경고/강퇴만)
    List<NotificationsDTO> selectChatRoomNotifsByMemberId(@Param("memberId") int memberId);

    // 채팅방 알림 패널을 열었을 때 안읽음 알림을 전부 읽음 처리
    void markAllChatRoomRead(@Param("memberId") int memberId);

    // 채팅방 알림 전체 삭제 버튼
    void deleteAllChatRoomNotifsByMemberId(@Param("memberId") int memberId);
}
