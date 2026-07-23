package com.youflex.service.admin;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.admin.WarningDTO;
import com.youflex.mapper.MemberMapper;
import com.youflex.mapper.admin.WarningMapper;
import com.youflex.service.NotificationsService;
import com.youflex.service.PointService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WarningService {

    // 정책서 5-4: 경고 3회 누적 시 계정 강제정지(탈퇴 처리)
    private static final int FORCE_WITHDRAW_THRESHOLD = 3;
    // 마이페이지 포인트 상점 - 경고 1회 차감권 가격
    private static final int WARNING_REVOKE_POINT_COST = 10000;

    private final WarningMapper warningMapper;
    private final MemberMapper memberMapper;
    private final PointService pointService;
    private final NotificationsService notificationsService;

    // 경고 부여(관리자 전용). 누적 유효 경고가 임계치에 도달하면 회원을 자동으로 강제탈퇴 처리한다.
    public void issueWarning(int memberId, String reason) {
        WarningDTO warningDTO = WarningDTO.builder()
                .memberId(memberId)
                .warningReason(reason)
                .build();
        warningMapper.insertWarning(warningDTO);
        // 헤더 🔔 알림 패널에 경고 알림 표시 (project-plan.md: "경고 부여 시 개인 알림으로 경고 알림 표시")
        notificationsService.notify(memberId, "경고", "운영자로부터 경고를 받았습니다. 사유: " + reason, "warning");

        int activeCount = warningMapper.countActiveWarnings(memberId);
        if (activeCount >= FORCE_WITHDRAW_THRESHOLD) {
            memberMapper.forceWithdraw(memberId);
        }
    }

    // 경고 차감(관리자 전용, 포인트 소진 없이 그냥 취소). 가장 최근 유효 경고 1건을 무효화한다.
    public void revokeWarning(int memberId) {
        warningMapper.revokeLatestWarning(memberId);
    }

    // 마이페이지 - 포인트 상점 "경고 1회 차감권 구매". 차감할 유효 경고가 없으면 포인트를 쓰기 전에 막고,
    // 있으면 포인트 10000점을 소진(잔액 부족 시 PointService.usePoints가 예외를 던짐)한 뒤 가장 최근
    // 유효 경고 1건을 '포인트차감취소'로 전환한다.
    @Transactional
    public void revokeWarningByPoints(int memberId) {
        if (warningMapper.countActiveWarnings(memberId) <= 0) {
            throw new IllegalStateException("차감할 유효한 경고가 없습니다.");
        }
        pointService.usePoints(memberId, WARNING_REVOKE_POINT_COST, "경고 1회 차감권 구매");
        warningMapper.revokeLatestWarning(memberId);
    }
}
