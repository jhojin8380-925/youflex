package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.youflex.dto.BannerDTO;
import com.youflex.mapper.BannerMapper;

import lombok.RequiredArgsConstructor;

/**
 * 배너(메인 화면 상단 히어로 배너) 관련 비즈니스 로직
 * - 목록 조회, 등록, 수정, 삭제 담당. 이미지 파일 저장 자체는 컨트롤러에서 처리 후 파일명만 넘어옴.
 */
@Service
@RequiredArgsConstructor
public class BannerService {

    private final BannerMapper bannerMapper;

    public List<BannerDTO> getBannerList() {
        return bannerMapper.selectBannerList();
    }

    public void createBanner(BannerDTO bannerDTO) {
        bannerMapper.insertBanner(bannerDTO);
    }

    // 수정 시 이미지 파일을 새로 첨부하지 않았다면 기존 배너의 이미지 파일명을 그대로 유지
    public void updateBanner(BannerDTO bannerDTO) {
        if (bannerDTO.getBannerImg() == null) {
            BannerDTO existing = bannerMapper.selectBannerById(bannerDTO.getBannerId());
            bannerDTO.setBannerImg(existing.getBannerImg());
        }
        bannerMapper.updateBanner(bannerDTO);
    }

    public void deleteBanner(int bannerId) {
        bannerMapper.deleteBanner(bannerId);
    }
}
