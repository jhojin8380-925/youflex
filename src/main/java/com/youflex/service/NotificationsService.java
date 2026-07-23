package com.youflex.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.youflex.dto.NotificationsDTO;
import com.youflex.mapper.NotificationsMapper;

import lombok.RequiredArgsConstructor;

/**
 * 헤더 🔔 알림(경고 부여 / 내 글 댓글 / QNA 답변완료 등) 생성 및 실시간 전송 공통 서비스
 * - 채팅방 전용 알림(/sub/member/{memberId}/notice, ChatroomController 방장 경고·강퇴)과는
 *   완전히 별개의 채널(/sub/member/{memberId}/alert)로 발행한다.
 * - 화면에 뜨는 알림은 DB(notifications 테이블)와 동기화된다: 목록 조회/읽음처리/삭제 모두 여기서 처리.
 */
@Service
@RequiredArgsConstructor
public class NotificationsService {

    private final NotificationsMapper notificationsMapper;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 알림을 DB에 적재하고 대상 회원에게 실시간으로 전송한다.
     * @param memberId 알림을 받을 회원
     * @param type 알림 종류 (경고 / 댓글 / QNA답변 등)
     * @param content 알림 문구
     * @param targetType 알림이 가리키는 대상 종류 (warning / review / qna 등)
     */
    public void notify(int memberId, String type, String content, String targetType) {
        NotificationsDTO notificationsDTO = NotificationsDTO.builder()
                .memberId(memberId)
                .notificationsType(type)
                .notificationsContent(content)
                .notificationsTargetType(targetType)
                .build();
        // useGeneratedKeys로 insert 후 notificationsDTO에 생성된 notificationsId가 채워짐
        notificationsMapper.insertNotification(notificationsDTO);

        Map<String, Object> payload = Map.of(
                "id", notificationsDTO.getNotificationsId(),
                "type", type,
                "message", content,
                "createdAt", LocalDateTime.now().toString()
        );
        messagingTemplate.convertAndSend("/sub/member/" + memberId + "/alert", (Object) payload);
    }

    // 헤더 🔔 알림 패널 최초 로드(새로고침/재접속 시에도 유지되도록 DB에서 최신순 조회)
    public List<NotificationsDTO> getNotifications(int memberId) {
        return notificationsMapper.selectByMemberId(memberId);
    }

    // 알림 패널을 열었을 때 전부 읽음 처리
    public void markAllRead(int memberId) {
        notificationsMapper.markAllRead(memberId);
    }

    // 개별 삭제(✕ 버튼)
    public void deleteNotification(int notificationsId, int memberId) {
        notificationsMapper.deleteNotification(notificationsId, memberId);
    }

    // 전체 삭제 버튼
    public void deleteAll(int memberId) {
        notificationsMapper.deleteAllByMemberId(memberId);
    }

    /**
     * 채팅방 전용 🔔 알림(입장/퇴장/경고/강퇴) DB 적재 전용 - 헤더 알림과 달리 실시간 push는 하지 않는다.
     * (채팅방은 이미 /sub/chatroom/{chatroomId} 브로드캐스트 시스템 메시지로 실시간 표시가 되고 있으므로,
     *  여기서는 새로고침/재접속해도 유지되도록 DB에 적재하는 역할만 한다)
     * @param memberId 알림을 받을 회원(현재 그 채팅방에 남아있는 참여자)
     * @param type 알림 종류 (입장 / 퇴장 / 경고 / 강퇴)
     * @param content 알림 문구 (채팅방 시스템 메시지와 동일한 문구)
     */
    public void recordChatRoomNotification(int memberId, String type, String content) {
        NotificationsDTO notificationsDTO = NotificationsDTO.builder()
                .memberId(memberId)
                .notificationsType(type)
                .notificationsContent(content)
                .notificationsTargetType("chatroom")
                .build();
        notificationsMapper.insertNotification(notificationsDTO);
    }

    // 채팅방 🔔 알림 패널 최초 로드
    public List<NotificationsDTO> getChatRoomNotifications(int memberId) {
        return notificationsMapper.selectChatRoomNotifsByMemberId(memberId);
    }

    // 채팅방 알림 패널을 열었을 때 전부 읽음 처리
    public void markAllChatRoomRead(int memberId) {
        notificationsMapper.markAllChatRoomRead(memberId);
    }

    // 채팅방 알림 전체 삭제 버튼
    public void deleteAllChatRoomNotifications(int memberId) {
        notificationsMapper.deleteAllChatRoomNotifsByMemberId(memberId);
    }
}
