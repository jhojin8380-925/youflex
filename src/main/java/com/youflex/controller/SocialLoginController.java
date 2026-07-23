package com.youflex.controller;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import com.youflex.dto.MemberDTO;
import com.youflex.service.MemberService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

// 카카오/구글 소셜로그인 - 이 프로젝트는 Spring Security를 쓰지 않으므로(세션 기반 수동 로그인),
// OAuth2 authorization code flow를 RestTemplate으로 직접 처리한다.
// application.properties의 youflex.oauth.{kakao|google}.* 값(클라이언트 키)만 채우면 바로 동작함.
@Controller
@RequiredArgsConstructor
public class SocialLoginController {

    private static final Logger log = LoggerFactory.getLogger(SocialLoginController.class);

    private final MemberService memberService;
    private final RestTemplate restTemplate;

    @Value("${youflex.oauth.kakao.client-id}")
    private String kakaoClientId;
    @Value("${youflex.oauth.kakao.client-secret:}")
    private String kakaoClientSecret;
    @Value("${youflex.oauth.kakao.redirect-uri}")
    private String kakaoRedirectUri;

    @Value("${youflex.oauth.google.client-id}")
    private String googleClientId;
    @Value("${youflex.oauth.google.client-secret}")
    private String googleClientSecret;
    @Value("${youflex.oauth.google.redirect-uri}")
    private String googleRedirectUri;

    // 1) "카카오로 로그인" 버튼 -> 카카오 인가 화면으로 이동
    @GetMapping("/oauth/kakao/login")
    public String kakaoLogin() {
        String url = "https://kauth.kakao.com/oauth/authorize"
                + "?client_id=" + kakaoClientId
                + "&redirect_uri=" + encode(kakaoRedirectUri)
                + "&response_type=code";
        return "redirect:" + url;
    }

    // 2) 카카오 인가 콜백 - code를 토큰으로 교환하고, 프로필 조회 후 로그인/가입 처리
    @GetMapping("/oauth/kakao/callback")
    public String kakaoCallback(@RequestParam(value = "code", required = false) String code,
                                @RequestParam(value = "error", required = false) String error,
                                HttpSession session) {
        if (error != null || code == null) {
            return "redirect:/login?error=social";
        }

        MultiValueMap<String, String> tokenRequest = new LinkedMultiValueMap<>();
        tokenRequest.add("grant_type", "authorization_code");
        tokenRequest.add("client_id", kakaoClientId);
        if (kakaoClientSecret != null && !kakaoClientSecret.isBlank()) {
            tokenRequest.add("client_secret", kakaoClientSecret);
        }
        tokenRequest.add("redirect_uri", kakaoRedirectUri);
        tokenRequest.add("code", code);

        Map<String, Object> tokenResponse = requestToken("https://kauth.kakao.com/oauth/token", tokenRequest);
        if (tokenResponse == null || tokenResponse.get("access_token") == null) {
            return "redirect:/login?error=social";
        }

        Map<String, Object> profile = requestProfile("https://kapi.kakao.com/v2/user/me",
                (String) tokenResponse.get("access_token"));
        if (profile == null) {
            return "redirect:/login?error=social";
        }
        String socialKey = String.valueOf(profile.get("id"));

        @SuppressWarnings("unchecked")
        Map<String, Object> kakaoAccount = (Map<String, Object>) profile.getOrDefault("kakao_account", Map.of());
        String email = (String) kakaoAccount.get("email");
        if (email == null || email.isBlank()) {
            // 이메일 제공에 동의하지 않은 경우 - member_email이 NOT NULL이라 대체 이메일을 채움
            email = "kakao_" + socialKey + "@social.youflex.local";
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> profileInfo = (Map<String, Object>) kakaoAccount.getOrDefault("profile", Map.of());
        String name = (String) profileInfo.get("nickname");

        return finishSocialLogin("카카오", socialKey, email, normalizeName(name, "카카오회원"), session);
    }

    // 3) "구글로 로그인" 버튼 -> 구글 인가 화면으로 이동
    @GetMapping("/oauth/google/login")
    public String googleLogin() {
        String url = "https://accounts.google.com/o/oauth2/v2/auth"
                + "?client_id=" + googleClientId
                + "&redirect_uri=" + encode(googleRedirectUri)
                + "&response_type=code"
                + "&scope=" + encode("openid email profile");
        return "redirect:" + url;
    }

    // 4) 구글 인가 콜백 - code를 토큰으로 교환하고, 프로필 조회 후 로그인/가입 처리
    @GetMapping("/oauth/google/callback")
    public String googleCallback(@RequestParam(value = "code", required = false) String code,
                                  @RequestParam(value = "error", required = false) String error,
                                  HttpSession session) {
        if (error != null || code == null) {
            return "redirect:/login?error=social";
        }

        MultiValueMap<String, String> tokenRequest = new LinkedMultiValueMap<>();
        tokenRequest.add("grant_type", "authorization_code");
        tokenRequest.add("client_id", googleClientId);
        tokenRequest.add("client_secret", googleClientSecret);
        tokenRequest.add("redirect_uri", googleRedirectUri);
        tokenRequest.add("code", code);

        Map<String, Object> tokenResponse = requestToken("https://oauth2.googleapis.com/token", tokenRequest);
        if (tokenResponse == null || tokenResponse.get("access_token") == null) {
            return "redirect:/login?error=social";
        }

        Map<String, Object> profile = requestProfile("https://www.googleapis.com/oauth2/v3/userinfo",
                (String) tokenResponse.get("access_token"));
        if (profile == null) {
            return "redirect:/login?error=social";
        }
        String socialKey = String.valueOf(profile.get("sub"));
        String email = (String) profile.get("email");
        if (email == null || email.isBlank()) {
            email = "google_" + socialKey + "@social.youflex.local";
        }
        String name = (String) profile.get("name");

        return finishSocialLogin("구글", socialKey, email, normalizeName(name, "구글회원"), session);
    }

    // 토큰 엔드포인트 공통 호출(카카오/구글 둘 다 application/x-www-form-urlencoded POST)
    private Map<String, Object> requestToken(String tokenUri, MultiValueMap<String, String> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    URI.create(tokenUri), new HttpEntity<>(body, headers), Map.class);
            return response.getBody();
        } catch (HttpStatusCodeException e) {
            // 카카오/구글 토큰 교환 실패 사유(잘못된 client_secret, redirect_uri 불일치 등)가
            // 응답 본문에 그대로 담겨 오므로 로그로 남겨서 다음에 바로 원인을 알 수 있게 함
            log.warn("소셜로그인 토큰 교환 실패 (uri={}, status={}): {}", tokenUri, e.getStatusCode(), e.getResponseBodyAsString());
            return null;
        } catch (Exception e) {
            log.warn("소셜로그인 토큰 교환 중 오류 (uri={})", tokenUri, e);
            return null;
        }
    }

    // 사용자 프로필 조회 공통 호출(Bearer 토큰으로 GET)
    private Map<String, Object> requestProfile(String profileUri, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    URI.create(profileUri), HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            return response.getBody();
        } catch (HttpStatusCodeException e) {
            log.warn("소셜로그인 프로필 조회 실패 (uri={}, status={}): {}", profileUri, e.getStatusCode(), e.getResponseBodyAsString());
            return null;
        } catch (Exception e) {
            log.warn("소셜로그인 프로필 조회 중 오류 (uri={})", profileUri, e);
            return null;
        }
    }

    // member_name이 varchar(20) NOT NULL이라 null/빈값/20자 초과를 여기서 미리 정리
    private String normalizeName(String name, String fallback) {
        String result = (name == null || name.isBlank()) ? fallback : name;
        return result.length() > 20 ? result.substring(0, 20) : result;
    }

    // 소셜 로그인/가입 공통 마무리 - 탈퇴 계정이면 로그인시키지 않고, 아니면 세션을 남기고 메인으로 이동
    // (session.loginMember 속성명은 fragments/layout.html 등에서 그대로 참조하므로 일반 로그인과 동일하게 맞춤)
    private String finishSocialLogin(String socialType, String socialKey, String email, String name, HttpSession session) {
        MemberDTO member = memberService.loginOrRegisterSocial(socialType, socialKey, email, name);
        if ("탈퇴".equals(member.getMemberDeleteStatus())) {
            return "redirect:/login?error=withdrawn";
        }
        session.setAttribute("loginMember", member);
        return "redirect:/";
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
