package com.youflex.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.youflex.dto.ReviewDTO;
import com.youflex.service.BannerService;
import com.youflex.service.ReviewListService;
import com.youflex.service.notice.NoticeService;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class MainController {

    // 인기 리뷰글 플랫폼 탭 - main.html의 .platform-tabs data-tab-target 값과 순서를 그대로 맞춤
    private static final List<String> POPULAR_PLATFORM_TABS = List.of("all", "netflix", "tving", "disney", "etc");

    private final BannerService bannerService;
    private final NoticeService noticeService;
    private final ReviewListService reviewListService;

    @GetMapping("/")
    public String main(Model model) {
        // 상단 히어로 배너 슬라이더 - 관리자 페이지 배너 설정 탭에서 등록한 목록을 그대로 노출
        model.addAttribute("bannerList", bannerService.getBannerList());
        // 공지사항 - 최신순 3건만 노출
        model.addAttribute("noticeList", noticeService.getRecentNoticeList(3));

        // 인기 리뷰글 - 플랫폼 탭별로 좋아요·별점 기준 top5 (project-plan.md 3-1 "베스트글" 정책)
        Map<String, List<ReviewDTO>> popularReviews = new LinkedHashMap<>();
        for (String platform : POPULAR_PLATFORM_TABS) {
            popularReviews.put(platform, reviewListService.getPopularReviews(platform));
        }
        model.addAttribute("popularReviews", popularReviews);

        return "main";
    }
}
