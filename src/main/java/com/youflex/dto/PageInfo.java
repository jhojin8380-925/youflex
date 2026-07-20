package com.youflex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// 여러 목록 API(관리자 회원 목록, 마이페이지 내 글 등)에서 공통으로 쓰는 페이징 정보.
// offset은 매퍼 LIMIT에 그대로 넘기고, totalPages는 컨트롤러 응답(JSON)에 그대로 실어보내면 됨.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageInfo {
    private int page;
    private int pageSize;
    private int totalCount;

    // page가 1 미만으로 들어와도 항상 1페이지 취급
    public static PageInfo of(int page, int pageSize, int totalCount) {
        return new PageInfo(Math.max(page, 1), pageSize, totalCount);
    }

    // 매퍼 LIMIT #{offset}, #{size}에 넘기는 시작 위치. totalCount를 아직 모를 때(목록 조회 전)도 계산 가능.
    public int getOffset() {
        return (page - 1) * pageSize;
    }

    // 총 페이지 수. 0건이어도 최소 1페이지로 취급해서 페이지네이션 UI가 안 깨지게 함.
    public int getTotalPages() {
        return Math.max(1, (int) Math.ceil((double) totalCount / pageSize));
    }
}
