package com.youflex.service;

import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.PageInfo;
import com.youflex.dto.PointHistoryDTO;
import com.youflex.mapper.MemberMapper;
import com.youflex.mapper.PointHistoryMapper;

import lombok.RequiredArgsConstructor;

// 여러 도메인(퀴즈 정답, 좋아요 등)이 공용으로 쓰는 포인트 적립 서비스.
@Service
@RequiredArgsConstructor
public class PointService {

    private static final int HISTORY_PAGE_SIZE = 10;

    private final MemberMapper memberMapper;
    private final PointHistoryMapper pointHistoryMapper;

    // 포인트 적립 - member.member_point 증가 + point_history에 '적립' 이력 기록을 한 트랜잭션으로 처리
    @Transactional
    public void awardPoints(int memberId, int amount, String reason) {
        memberMapper.addPoint(memberId, amount);
        pointHistoryMapper.insertPointHistory(PointHistoryDTO.builder()
                .memberId(memberId)
                .pointHistoryAmount(amount)
                .pointHistoryType("적립")
                .pointHistoryReason(reason)
                .build());
    }

//	마이페이지 - 포인트 내역 탭(10개씩 페이징). point_history에는 잔액 컬럼이 없어서, 전체 이력을
//	오래된 순으로 가져와 앞에서부터 누적 합산한 뒤 최신순으로 뒤집어 페이징한다. page는 1부터 시작.
    public List<PointHistoryDTO> getHistory(int memberId, int page) {
        List<PointHistoryDTO> all = pointHistoryMapper.findByMemberId(memberId); // 오래된 순
        int balance = 0;
        for (PointHistoryDTO h : all) {
            balance += "적립".equals(h.getPointHistoryType()) ? h.getPointHistoryAmount() : -h.getPointHistoryAmount();
            h.setPointHistoryBalance(balance);
        }
        Collections.reverse(all); // 최신순으로

        int offset = PageInfo.of(page, HISTORY_PAGE_SIZE, all.size()).getOffset();
        if (offset >= all.size()) {
            return List.of();
        }
        return all.subList(offset, Math.min(offset + HISTORY_PAGE_SIZE, all.size()));
    }

    public int getHistoryTotalCount(int memberId) {
        return pointHistoryMapper.countByMemberId(memberId);
    }

    public int getHistoryPageSize() {
        return HISTORY_PAGE_SIZE;
    }
}
