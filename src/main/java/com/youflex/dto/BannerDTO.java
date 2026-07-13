package com.youflex.dto;

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
    private String bannerTitle;
    private String bannerContent;
    private String bannerImg;
}
