package com.youflex.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;

import com.youflex.dto.MemberDTO;
import com.youflex.service.MemberService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class MemberController {

    private static final String REMEMBER_ID_COOKIE = "rememberedId";
    private static final int REMEMBER_ID_MAX_AGE = 60 * 60 * 24 * 30; // 30일

    private final MemberService memberService;

    // 로그인 폼 진입 시 rememberedId 쿠키가 있으면 아이디 입력창에 미리 채워줌
    @GetMapping("/login")
    public String loginForm(@CookieValue(value = REMEMBER_ID_COOKIE, required = false) String rememberedId,
                             Model model) {
        model.addAttribute("rememberedId", rememberedId);
        return "member/login";
    }

    @PostMapping("/login")
    public String login(@RequestParam String memberLoginid,
                         @RequestParam String memberPwd,
                         @RequestParam(required = false) String rememberId,
                         HttpSession session,
                         HttpServletResponse response,
                         Model model) {
        MemberDTO loginMember = memberService.login(memberLoginid, memberPwd);

        // "아이디 저장" 체크박스 결과에 따라 쿠키를 새로 저장하거나(maxAge>0) 즉시 만료시킴(maxAge=0).
        // 로그인 성공/실패와 무관하게 항상 반영(실패해도 다음에 입력한 아이디는 기억해줌).
        Cookie idCookie = new Cookie(REMEMBER_ID_COOKIE, memberLoginid);
        idCookie.setPath("/");
        idCookie.setMaxAge(rememberId != null ? REMEMBER_ID_MAX_AGE : 0);
        response.addCookie(idCookie);

        if (loginMember == null) {
            model.addAttribute("loginError", "아이디 또는 비밀번호가 올바르지 않습니다.");
            model.addAttribute("rememberedId", memberLoginid);
            return "member/login";
        }

        // fragments/layout.html 등 템플릿에서 session.loginMember로 로그인 상태를 판단하므로
        // 이 세션 속성명을 그대로 유지해야 함(Spring Security 로그인 기능은 사용하지 않음).
        session.setAttribute("loginMember", loginMember);
        return "redirect:/";
    }

    // 세션을 통째로 무효화하는 방식의 단순 로그아웃(별도 확인 절차 없음)
    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/";
    }

    @GetMapping("/join")
    public String joinForm() {
        return "member/join";
    }

    // MemberDTO를 폼 파라미터로 직접 바인딩. join.html의 input name이 memberLoginid 등
    // DTO 필드명과 일치해야 자동 바인딩됨(memberRole 같은 민감 필드는 폼에 없으므로 바인딩 안 됨).
    @PostMapping("/join")
    public String join(MemberDTO memberDTO, Model model) {
        // JS 중복확인 버튼을 안 눌렀거나 우회한 경우를 대비한 서버단 재검증
        if (memberService.isLoginIdTaken(memberDTO.getMemberLoginid())) {
            model.addAttribute("joinError", "이미 사용 중인 아이디입니다.");
            return "member/join";
        }
        memberService.join(memberDTO);
        return "redirect:/login";
    }

    // join.html의 "중복확인" 버튼이 fetch로 호출하는 AJAX 엔드포인트
    @GetMapping("/join/check-id")
    @ResponseBody
    public Map<String, Boolean> checkLoginId(@RequestParam String loginId) {
        return Map.of("available", !memberService.isLoginIdTaken(loginId));
    }
}
