package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.youflex.dto.WarningDTO;

@Mapper
public interface WarningMapper {

    // 경고 부여
    void insertWarning(WarningDTO warningDTO);

    // 회원의 유효(취소되지 않은) 경고 누적 횟수 - 3회 도달 시 강제탈퇴 판단에 사용
    int countActiveWarnings(int memberId);

    // 경고 차감(포인트 소진) - 가장 최근의 유효 경고 1건을 '포인트차감취소' 상태로 전환.
    // 반환값이 0이면 차감할 유효 경고가 없었다는 뜻.
    int revokeLatestWarning(int memberId);
}
