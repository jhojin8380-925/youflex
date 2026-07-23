package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.NotificationsDTO;

@Mapper
public interface NotificationsMapper {

    // 헤더 🔔 알림 등록 (경고/댓글/QNA답변 등)
    void insertNotification(NotificationsDTO notificationsDTO);

    // 헤더 🔔 알림 패널 초기 로드 - 특정 회원의 알림을 최신순으로 조회
    List<NotificationsDTO> selectByMemberId(@Param("memberId") int memberId);

    // 알림 패널을 열었을 때 안읽음 알림을 전부 읽음 처리
    void markAllRead(@Param("memberId") int memberId);

    // 개별 삭제(✕ 버튼) - 본인 알림만 삭제되도록 memberId로 범위 제한
    void deleteNotification(@Param("notificationsId") int notificationsId, @Param("memberId") int memberId);

    // 전체 삭제 버튼
    void deleteAllByMemberId(@Param("memberId") int memberId);
}
