package com.youflex.service.admin;

import org.springframework.stereotype.Service;

import com.youflex.mapper.admin.AdminStatsMapper;

import lombok.RequiredArgsConstructor;

/**
 * 관리자 대시보드 - 상단 KPI 카드용 가입/탈퇴 통계
 */
@Service
@RequiredArgsConstructor
public class AdminStatsService {

    private final AdminStatsMapper adminStatsMapper;

    public int getTodayJoinCount() {
        return adminStatsMapper.countJoinedToday();
    }

    public int getThisWeekJoinCount() {
        return adminStatsMapper.countJoinedThisWeek();
    }

    public int getTodayWithdrawCount() {
        return adminStatsMapper.countWithdrawnToday();
    }

    public int getThisWeekWithdrawCount() {
        return adminStatsMapper.countWithdrawnThisWeek();
    }
}
