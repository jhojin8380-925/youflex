package com.youflex.service;

import org.springframework.stereotype.Service;

import com.youflex.dto.WarningDTO;
import com.youflex.mapper.MemberMapper;
import com.youflex.mapper.WarningMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WarningService {

    // 정책서 5-4: 경고 3회 누적 시 계정 강제정지(탈퇴 처리)
    private static final int FORCE_WITHDRAW_THRESHOLD = 3;

    private final WarningMapper warningMapper;
    private final MemberMapper memberMapper;

    // 경고 부여. 누적 유효 경고가 임계치에 도달하면 회원을 자동으로 강제탈퇴 처리한다.
    public void issueWarning(int memberId, String reason) {
        WarningDTO warningDTO = WarningDTO.builder()
                .memberId(memberId)
                .warningReason(reason)
                .build();
        warningMapper.insertWarning(warningDTO);

        int activeCount = warningMapper.countActiveWarnings(memberId);
        if (activeCount >= FORCE_WITHDRAW_THRESHOLD) {
            memberMapper.forceWithdraw(memberId);
        }
    }

    // 경고 차감(포인트 소진). 가장 최근 유효 경고 1건을 무효화한다.
    public void revokeWarning(int memberId) {
        warningMapper.revokeLatestWarning(memberId);
    }
}
