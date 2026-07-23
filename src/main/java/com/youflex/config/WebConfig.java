package com.youflex.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // ReviewController/BannerController가 youflex.upload.path 폴더에 저장한 이미지를
    // "/upload/파일명" URL로 서빙하기 위한 리소스 핸들러 (기존에 누락되어 있었음)
    @Value("${youflex.upload.path}")
    private String uploadPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/html/assets/");

        registry.addResourceHandler("/upload/**")
                .addResourceLocations("file:" + uploadPath + "/");
    }

    // SocialLoginController가 카카오/구글 토큰 교환·프로필 조회에 사용하는 공용 HTTP 클라이언트
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
