package com.youflex.dto;

import org.springframework.web.multipart.MultipartFile;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BannerDTO {
    private int bannerId;
    private String bannerBadge;
    private String bannerTitle;
    private String bannerContent;
    private String bannerImg;

    // 파일 업로드 - DB 컬럼 아님(ReviewDTO.imgFile과 동일한 패턴)
    private MultipartFile bannerImgFile;
}
