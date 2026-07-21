package com.youflex.mapper.admin;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AdminStatsMapper {

    // 오늘 가입한 회원 수
    int countJoinedToday();

    // 이번주(월요일 시작) 가입한 회원 수
    int countJoinedThisWeek();

    // 오늘 탈퇴 처리된 회원 수
    int countWithdrawnToday();

    // 이번주(월요일 시작) 탈퇴 처리된 회원 수
    int countWithdrawnThisWeek();
}
