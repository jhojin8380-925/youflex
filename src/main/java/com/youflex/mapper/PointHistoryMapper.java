package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.PointHistoryDTO;

@Mapper
public interface PointHistoryMapper {

    // 포인트 적립/차감 이력 저장(마이페이지 "포인트 내역" 탭 등에서 나중에 조회할 때 사용)
    void insertPointHistory(PointHistoryDTO pointHistoryDTO);

    // 마이페이지 - 포인트 내역 탭: 이 회원의 전체 이력을 오래된 순으로 조회(잔액은 서비스에서 누적 계산)
    List<PointHistoryDTO> findByMemberId(@Param("memberId") int memberId);

    // 마이페이지 - 포인트 내역 탭 총 개수(페이지네이션 계산용)
    int countByMemberId(@Param("memberId") int memberId);
}
