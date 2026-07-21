package com.youflex.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.youflex.service.BannerService;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class MainController {

    private final BannerService bannerService;

    @GetMapping("/")
    public String main(Model model) {
        // 상단 히어로 배너 슬라이더 - 관리자 페이지 배너 설정 탭에서 등록한 목록을 그대로 노출
        model.addAttribute("bannerList", bannerService.getBannerList());
        return "main";
    }
}
