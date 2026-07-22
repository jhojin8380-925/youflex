package com.youflex.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.youflex.dto.BookmarkDTO;
import com.youflex.dto.MemberDTO;
import com.youflex.dto.PageInfo;
import com.youflex.dto.PointHistoryDTO;
import com.youflex.dto.ReviewDTO;
import com.youflex.service.GenreCategoryService;
import com.youflex.service.MemberService;
import com.youflex.service.PointService;
import com.youflex.service.ReviewService;

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
    private final GenreCategoryService genreCategoryService;
    private final ReviewService reviewService;
    private final PointService pointService;

    // 로그인 폼 진입 시 rememberedId 쿠키가 있으면 아이디 입력창에 미리 채워줌
    @GetMapping("/login")
    public String loginForm(@CookieValue(value = REMEMBER_ID_COOKIE, required = false) String rememberedId,
                             Model model) {
        model.addAttribute("rememberedId", rememberedId);
        return "member/login";
    }

    @PostMapping("/login")
    public String login(@RequestParam("memberLoginid") String memberLoginid,
                         @RequestParam("memberPwd") String memberPwd,
                         @RequestParam(value = "rememberId", required = false) String rememberId,
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
        // 아이디/비번은 맞았지만 탈퇴신청된 계정이면 로그인시키지 않고 별도 안내
        if ("탈퇴".equals(loginMember.getMemberDeleteStatus())) {
            model.addAttribute("loginError", "탈퇴 신청된 계정입니다.");
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

    // 취향 선택 모달을 genre_category 테이블 값으로 채우기 위해 목록을 같이 넘김
    @GetMapping("/join")
    public String joinForm(Model model) {
        model.addAttribute("genres", genreCategoryService.getAllGenres());
        return "member/join";
    }

    // MemberDTO를 폼 파라미터로 직접 바인딩. join.html의 input name이 memberLoginid 등
    // DTO 필드명과 일치해야 자동 바인딩됨(memberGrade 같은 민감 필드는 폼에 없으므로 바인딩 안 됨).
    // genreCategoryIds는 취향 선택 모달에서 선택한 장르마다 추가되는 hidden input들이 리스트로 바인딩된 것.
    @PostMapping("/join")
    public String join(MemberDTO memberDTO,
                        @RequestParam(value = "genreCategoryIds", required = false) List<Integer> genreCategoryIds,
                        Model model) {
        // JS 중복확인 버튼을 안 눌렀거나 우회한 경우를 대비한 서버단 재검증
        if (memberService.isLoginIdTaken(memberDTO.getMemberLoginid())) {
            model.addAttribute("joinError", "이미 사용 중인 아이디입니다.");
            model.addAttribute("genres", genreCategoryService.getAllGenres());
            return "member/join";
        }
        memberService.join(memberDTO, genreCategoryIds);
        return "redirect:/login";
    }

    // join.html의 "중복확인" 버튼이 fetch로 호출하는 AJAX 엔드포인트
    @GetMapping("/join/check-id")
    @ResponseBody
    public Map<String, Boolean> checkLoginId(@RequestParam("loginId") String loginId) {
        return Map.of("available", !memberService.isLoginIdTaken(loginId));
    }

    // 마이페이지 - 내 정보 탭(프로필 카드 + 회원정보 수정 폼)에 실제 회원 데이터를 내려줌
    @GetMapping("/mypage")
    public String myPage(HttpSession session, Model model) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember)) {
            return "redirect:/login";
        }
        model.addAttribute("myInfo", memberService.getMemberDetail(loginMember.getMemberId()));
        model.addAttribute("genres", genreCategoryService.getAllGenres());
        // 취향 선택 모달을 열었을 때 기존에 골라둔 장르가 체크된 상태로 보이도록 같이 내려줌
        model.addAttribute("myGenreCategoryIds", memberService.getMemberGenreCategoryIds(loginMember.getMemberId()));
        return "member/mypage";
    }

    // 마이페이지 - 회원정보 수정 저장. 현재 비밀번호가 맞을 때만 반영(아이디는 폼에 없으므로 수정 불가).
    @PostMapping("/mypage")
    public String updateMyPage(MemberDTO memberDTO,
                                @RequestParam("currentPassword") String currentPassword,
                                HttpSession session,
                                Model model,
                                RedirectAttributes redirectAttributes) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember)) {
            return "redirect:/login";
        }
        int memberId = loginMember.getMemberId();
        if (!memberService.isCurrentPasswordValid(memberId, currentPassword)) {
            model.addAttribute("profileError", "현재 비밀번호가 일치하지 않습니다.");
            model.addAttribute("myInfo", memberService.getMemberDetail(memberId));
            model.addAttribute("genres", genreCategoryService.getAllGenres());
            model.addAttribute("myGenreCategoryIds", memberService.getMemberGenreCategoryIds(memberId));
            // 비밀번호가 틀리면 여기서 바로 mypage 화면을 다시 그려서 profileError를 보여주고, 저장은 하지 않음
            return "member/mypage";
        }
        memberService.updateProfile(memberId, memberDTO.getMemberPwd(), memberDTO);
        // 헤더 등에서 쓰는 session.loginMember도 최신 정보로 갱신
        session.setAttribute("loginMember", memberService.getMemberDetail(memberId));
        // redirect 후 /mypage 화면에서 1회성으로 저장 완료 메시지를 띄우기 위한 flash attribute
        redirectAttributes.addFlashAttribute("profileSuccess", "회원정보가 변경되었습니다.");
        return "redirect:/mypage";
    }

    // 마이페이지 - "등업신청" 버튼이 fetch로 호출하는 AJAX 엔드포인트. 조건(게시글 3회/유효경고 0회/좋아요
    // 총합 100회)을 만족하면 상태를 '신청'으로 바꿔서 관리자 등업신청 관리 화면에 노출시킴.
    @PostMapping("/mypage/grade-upgrade")
    @ResponseBody
    public ResponseEntity<?> requestGradeUpgrade(HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            memberService.requestGradeUpgrade(loginMember.getMemberId());
            return ResponseEntity.ok().build();
        } catch (IllegalStateException e) {
            // 조건 미달 사유를 그대로 내려줘서 mypage.js가 알림창에 보여줌
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // 마이페이지 - 취향(관심 장르) 선택 모달의 "완료" 버튼이 fetch로 호출하는 AJAX 엔드포인트.
    // 선택한 장르 목록으로 통째로 교체 저장(최대 3개는 MemberService에서 재검증).
    @PostMapping("/mypage/genres")
    @ResponseBody
    public ResponseEntity<Void> updateMyGenres(@RequestParam(value = "genreCategoryIds", required = false) List<Integer> genreCategoryIds,
                                                HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        memberService.updateGenrePreferences(loginMember.getMemberId(), genreCategoryIds);
        return ResponseEntity.ok().build();
    }

    // 마이페이지 - "탈퇴신청" 버튼이 fetch로 호출하는 AJAX 엔드포인트. 관리자 강제탈퇴와 동일하게 즉시
    // member_delete_status를 '탈퇴'로 바꿔서 저장(관리자 탈퇴신청 관리 화면에 바로 노출됨).
    // 신청 직후엔 더 이상 로그인 상태를 유지할 이유가 없어서 세션도 같이 무효화함.
    @PostMapping("/mypage/withdraw")
    @ResponseBody
    public ResponseEntity<Void> requestWithdraw(HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        memberService.requestWithdraw(loginMember.getMemberId());
        session.invalidate();
        return ResponseEntity.ok().build();
    }

    // 마이페이지 - "내 글" 탭이 fetch로 호출하는 AJAX 엔드포인트. 로그인한 회원이 쓴 글만 5개씩 페이징해서 내려줌.
    @GetMapping("/mypage/reviews")
    @ResponseBody
    public ResponseEntity<?> myReviews(@RequestParam(value = "page", defaultValue = "1") int page,
                                        HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        int memberId = loginMember.getMemberId();
        List<ReviewDTO> reviews = reviewService.getMyReviews(memberId, page);
        int totalCount = reviewService.getMyReviewsTotalCount(memberId);
        PageInfo pageInfo = PageInfo.of(page, reviewService.getMyReviewsPageSize(), totalCount);
        return ResponseEntity.ok(Map.of(
                "reviews", reviews,
                "totalCount", pageInfo.getTotalCount(),
                "totalPages", pageInfo.getTotalPages(),
                "page", pageInfo.getPage()
        ));
    }

    // 마이페이지 - "북마크" 탭이 fetch로 호출하는 AJAX 엔드포인트. 내가 북마크한 글만 5개씩 페이징해서 내려줌.
    @GetMapping("/mypage/bookmarks")
    @ResponseBody
    public ResponseEntity<?> myBookmarks(@RequestParam(value = "page", defaultValue = "1") int page,
                                          HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        int memberId = loginMember.getMemberId();
        List<BookmarkDTO> bookmarks = reviewService.getMyBookmarks(memberId, page);
        int totalCount = reviewService.getMyBookmarksTotalCount(memberId);
        PageInfo pageInfo = PageInfo.of(page, reviewService.getMyBookmarksPageSize(), totalCount);
        return ResponseEntity.ok(Map.of(
                "bookmarks", bookmarks,
                "totalCount", pageInfo.getTotalCount(),
                "totalPages", pageInfo.getTotalPages(),
                "page", pageInfo.getPage()
        ));
    }

    // 마이페이지 - "포인트 내역" 탭이 fetch로 호출하는 AJAX 엔드포인트. 10개씩 페이징해서 내려줌.
    @GetMapping("/mypage/points")
    @ResponseBody
    public ResponseEntity<?> myPoints(@RequestParam(value = "page", defaultValue = "1") int page,
                                       HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        if (!(loginMemberObj instanceof MemberDTO loginMember)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        int memberId = loginMember.getMemberId();
        List<PointHistoryDTO> history = pointService.getHistory(memberId, page);
        int totalCount = pointService.getHistoryTotalCount(memberId);
        PageInfo pageInfo = PageInfo.of(page, pointService.getHistoryPageSize(), totalCount);
        return ResponseEntity.ok(Map.of(
                "history", history,
                "totalCount", pageInfo.getTotalCount(),
                "totalPages", pageInfo.getTotalPages(),
                "page", pageInfo.getPage()
        ));
    }
}
