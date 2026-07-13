package com.youflex.dto;

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
public class NotificationsDTO {
    private int notificationsId;
    private int memberId;
    private String notificationsType;
    private String notificationsCreatedAt;
}
