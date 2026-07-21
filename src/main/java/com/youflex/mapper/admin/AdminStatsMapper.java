package com.youflex.mapper.admin;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AdminStatsMapper {

    // 오늘 가입한 회원 수
    int countJoinedToday();

    // 이번주(월요일 시작) 가입한 회원 수
    int countJoinedThisWeek();

    // 누적 탈퇴자수 - member_withdrawal_log 전체 건수(탈퇴 승인 시점에 기록됨)
    int countTotalWithdrawn();
}
