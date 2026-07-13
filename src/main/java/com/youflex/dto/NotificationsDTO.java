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
public class NotificationsDTO {
    private int notificationsId;
    private int memberId;
    private String notificationsType;
    private String notificationsContent;
    private String notificationsTargetType;
    private Integer notificationsTargetId;
    private String notificationsReadStatus;
    private LocalDateTime notificationsCreatedAt;
}
