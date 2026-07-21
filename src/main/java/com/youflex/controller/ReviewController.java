package com.youflex.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import com.youflex.dto.CommentDTO;
import com.youflex.dto.MemberDTO;
import com.youflex.dto.ReviewDTO;
import com.youflex.service.CommentService;
import com.youflex.service.GenreCategoryService;
import com.youflex.service.ReviewService;
import com.youflex.service.ReviewService.LikeResult;

import jakarta.servlet.http.HttpSession;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ReviewController {
//	중괄호 짝 찾기 : ctrl+shift+p
	
	private final GenreCategoryService genreCategoryService;
	private final ReviewService reviewService;
	private final CommentService commentService;
	
	
//	application.properties의 youflex.upload.path값을 가져옴
	@Value("${youflex.upload.path}")
	private String uploadPath;

	
//	1) 작성 폼으로 이동
	@GetMapping("/review/write")
	public String writeForm(HttpSession session, Model model) {
//		세션에 loginMember가 없으면 => 로그인 페이지로 이동
		if(session.getAttribute("loginMember") == null) {
			return "redirect:/login";
		}
		
		// 모달에서 선택한 취향을 genre_category 테이블로 넘기기
		model.addAttribute("genres", genreCategoryService.getAllGenres());
		
		return "review/write";
	}
	
//	2) 리뷰 글 작성
	@PostMapping("/review/write")
	public String write(ReviewDTO reviewDTO, HttpSession session,
			@RequestParam(value="genreCategoryIds", required=false) List<Integer> genreCategoryIds, Model model) throws IOException{	//genreCategoryIds : write.js에서 name과 변수명이 같아야함
//		로그인 여부 확인
		if(session.getAttribute("loginMember") == null) {
			return "redirect:/login";
		}
		
//		세션에서 로그인 회원 정보 꺼내기(작성자 정보)
		MemberDTO loginMember = (MemberDTO)session.getAttribute("loginMember");
		
//		ReviewDTO에 작성자 번호(memberId) 설정
		reviewDTO.setMemberId(loginMember.getMemberId());
//		System.out.println(reviewDTO.getMemberId());
		if(reviewDTO.getImgFile() != null && !reviewDTO.getImgFile().isEmpty()) {
//			파일 저장 후 DB에 저장할 파일명을 reviewDTO에 세팅
			String savedFileName = saveFile(reviewDTO.getImgFile());
			reviewDTO.setReviewImg(savedFileName);
		}
		
//		게시글 저장
		reviewService.write(reviewDTO, genreCategoryIds);
		
		
		
//		저장 완료 후 메인 화면으로 이동
		return "redirect:/";
	}

//	3) 게시글 상세보기
	@GetMapping("/review/{reviewId}")
	public String detail(@PathVariable("reviewId") int reviewId, Model model, HttpSession session) {
//		같은 세션에서 이미 조회한 게시글이면 조회수를 다시 올리지 않음 (F5 새로고침 등)
		boolean increaseHit = isFirstViewInSession(session, reviewId);
		ReviewDTO review = reviewService.findById(reviewId, increaseHit);
		model.addAttribute("review", review);

//		좋아요/북마크 버튼 초기 상태(로그인 상태일 때만 의미가 있음)
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		boolean liked = loginMember != null && reviewService.isLikedByMember(reviewId, loginMember.getMemberId());
		boolean bookmarked = loginMember != null && reviewService.isBookmarkedByMember(reviewId, loginMember.getMemberId());
		model.addAttribute("liked", liked);
		model.addAttribute("bookmarked", bookmarked);
		model.addAttribute("likeCount", reviewService.getLikeCount(reviewId));

//		댓글/대댓글 목록 (로그인 상태면 좋아요 여부까지 함께 조회)
		Integer viewerMemberId = loginMember != null ? loginMember.getMemberId() : null;
		List<CommentDTO> comments = commentService.getComments(reviewId, viewerMemberId);
		model.addAttribute("comments", comments);
		model.addAttribute("commentCount", comments.stream().mapToInt(c -> 1 + c.getReplies().size()).sum());

//		베스트 댓글 미리보기(상위 3개, 좋아요 많은 순) - comments 리스트 안에도 그대로 남아있어 전체 댓글에도 같이 보임
		List<CommentDTO> bestComments = comments.stream()
				.filter(CommentDTO::isBest)
				.sorted(Comparator.comparingInt(CommentDTO::getLikeCount).reversed())
				.collect(Collectors.toList());
		model.addAttribute("bestComments", bestComments);
		return "review/detail";
	}

//	좋아요 토글
	@PostMapping("/review/{reviewId}/like")
	@ResponseBody
	public ResponseEntity<?> toggleLike(@PathVariable("reviewId") int reviewId, HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		LikeResult result = reviewService.toggleLike(reviewId, loginMember.getMemberId());
		return ResponseEntity.ok(Map.of("liked", result.isLiked(), "likeCount", result.getLikeCount()));
	}

//	북마크 토글
	@PostMapping("/review/{reviewId}/bookmark")
	@ResponseBody
	public ResponseEntity<?> toggleBookmark(@PathVariable("reviewId") int reviewId, HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		boolean bookmarked = reviewService.toggleBookmark(reviewId, loginMember.getMemberId());
		return ResponseEntity.ok(Map.of("bookmarked", bookmarked));
	}

//	게시글 신고 등록
	@PostMapping("/review/{reviewId}/report")
	@ResponseBody
	public ResponseEntity<?> report(@PathVariable("reviewId") int reviewId,
			@RequestBody ReportRequest request, HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		reviewService.reportReview(reviewId, loginMember.getMemberId(), request.getReason(), request.getContent());
		return ResponseEntity.ok().build();
	}

//	신고 등록 요청 바디 - { reason, content }
	@Data
	static class ReportRequest {
		private String reason;
		private String content;
	}

//	세션에 이 게시글을 조회한 이력이 있는지 확인하고, 없으면 이력에 추가하면서 true(최초 조회) 반환
	@SuppressWarnings("unchecked")
	private boolean isFirstViewInSession(HttpSession session, int reviewId) {
		Set<Integer> viewedReviewIds = (Set<Integer>) session.getAttribute("viewedReviewIds");
		if (viewedReviewIds == null) {
			viewedReviewIds = new HashSet<>();
			session.setAttribute("viewedReviewIds", viewedReviewIds);
		}
		return viewedReviewIds.add(reviewId);
	}

//	----- 파일 저장 메서드 -----
//	반환값 : DB에 저장할 새 파일명(UUID기반)
	private String saveFile(MultipartFile file) throws IOException{
//		(1) 원본 파일명에서 확장자 추출
//		getOriginalFilename() : 사용자 PC에서 원본 파일명을 반환
//					ex) "pizza.jpg"
//		lastIndexOf(".") : 마지막 점(.) 위치 찾기
//		substring(점위치) : 점 포함 이후 문자열 추출 -> ".jpg"
		String originalName = file.getOriginalFilename();
		String ext = originalName.substring(originalName.lastIndexOf("."));
//		ex) "피자.jpg" => ext = ".jpg"
		
//		(2) UUID로 고유한 새 파일명 생성
//		randomUUID() : 겹치지 않는 고유 ID생성
//		toString() - "5550e8400-e49b..." 형태의 문자열로 반환
		String savedName = UUID.randomUUID().toString() + ext;
		
//		(3) 업로드 폴더가 없으면 자동으로 생성
//		new File(uploadPath) - "C:/upload/todayeat/" 폴더를 가리키는 객체
		File uploadDir = new File(uploadPath);
		if(!uploadDir.exists()) {
//			폴더가 없다면 폴더 생성
			uploadDir.mkdirs();
		}
		
//		(4) 파일 실제 저장
//		Paths.get(uploadPath+savedName) - 저장할 전체 경로 생성
//		ex) C:/upload/todayeat/550....jpg
		Path savePath = Paths.get(uploadPath+savedName);
		
//		Files.copy(파일데이터, 저장경로)
//		getInputStream() : MultipartFile에서 실제 파일 데이터를 꺼냄
		Files.copy(file.getInputStream(), savePath);
		
//		(5) DB에 저장할 파일명 반환(전체 경로가 아닌 이름만)
//		나중에 <img src="/upload/파일명"> 형태로 사용
		
		return savedName;
	}
	
	
}
