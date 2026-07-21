package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.youflex.dto.BannerDTO;

@Mapper
public interface BannerMapper {

    // 배너 목록 조회 (등록순)
    List<BannerDTO> selectBannerList();

    // 배너 단건 조회 (수정 시 이미지 미첨부하면 기존 파일명 유지에 사용)
    BannerDTO selectBannerById(int bannerId);

    // 배너 등록
    void insertBanner(BannerDTO bannerDTO);

    // 배너 수정
    void updateBanner(BannerDTO bannerDTO);

    // 배너 삭제
    void deleteBanner(int bannerId);
}
