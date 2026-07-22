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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MultipartFile;

import com.youflex.dto.CommentDTO;
import com.youflex.dto.GenreCategoryDTO;
import com.youflex.dto.MemberDTO;
import com.youflex.dto.ReviewDTO;
import com.youflex.exception.BadWordDetectedException;
import com.youflex.exception.ReviewNotFoundException;
import com.youflex.service.BadWordService;
import com.youflex.service.CommentService;
import com.youflex.service.GenreCategoryService;
import com.youflex.service.ReviewDraftService;
import com.youflex.service.ReviewService;
import com.youflex.service.ReviewService.LikeResult;

import jakarta.servlet.http.HttpSession;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ReviewController {
	
	private final GenreCategoryService genreCategoryService;
	private final ReviewService reviewService;
	private final CommentService commentService;
	private final ReviewDraftService reviewDraftService;
	private final BadWordService badWordService;
	
	// application.properties의 youflex.upload.path값을 가져옴
	@Value("${youflex.upload.path}")
	private String uploadPath;

	// 1) 작성 폼으로 이동
	@GetMapping("/review/write")
	public String writeForm(@RequestParam(value="error", required=false) String error,
			HttpSession session, Model model) {
		// 세션에 loginMember가 없으면 => 로그인 페이지로 이동
		if(session.getAttribute("loginMember") == null) {
			return "redirect:/login";
		}

		// 모달에서 선택한 취향을 genre_category 테이블로 넘기기
		model.addAttribute("genres", genreCategoryService.getAllGenres());

		// 금칙어 포함으로 등록이 막혀 되돌아온 경우 안내 문구 표시
		if("badword".equals(error)) {
			model.addAttribute("badWordError", "금칙어가 포함되어 있어 등록할 수 없습니다. 내용을 수정한 후 다시 시도해주세요.");
		}

		return "review/write";
	}
	
	// 2) 리뷰 글 작성
	@PostMapping("/review/write")
	public String write(ReviewDTO reviewDTO, HttpSession session,
			@RequestParam(value="genreCategoryIds", required=false) List<Integer> genreCategoryIds, 
			@RequestParam(value="reviewDraftId", defaultValue="0") int reviewDraftId, 
			Model model) throws IOException {
		
		// 로그인 여부 확인
		if(session.getAttribute("loginMember") == null) {
			return "redirect:/login";
		}
		
		// 세션에서 로그인 회원 정보 꺼내기(작성자 정보)
		MemberDTO loginMember = (MemberDTO)session.getAttribute("loginMember");
		
		// ReviewDTO에 작성자 번호(memberId) 설정
		reviewDTO.setMemberId(loginMember.getMemberId());

		try {
			// 금칙어 포함 여부를 파일 저장 전에 먼저 검사해서 불필요한 업로드를 막음 (제목/본문/관련 작품 모두 검사)
			badWordService.validateContent(reviewDTO.getReviewTitle());
			badWordService.validateContent(reviewDTO.getReviewContent());
			badWordService.validateContent(reviewDTO.getReviewRelated());
		} catch (BadWordDetectedException e) {
			// 글쓰기 폼으로 되돌아가서 안내 문구를 보여줌 (작성 중이던 내용은 유지되지 않음)
			return "redirect:/review/write?error=badword";
		}

		if(reviewDTO.getImgFile() != null && !reviewDTO.getImgFile().isEmpty()) {
			// 파일 저장 후 DB에 저장할 파일명을 reviewDTO에 세팅
			String savedFileName = saveFile(reviewDTO.getImgFile());
			reviewDTO.setReviewImg(savedFileName);
		}

		// 게시글 저장
		reviewService.write(reviewDTO, genreCategoryIds);

		// 게시글 등록 성공 시 관련 임시저장글 자동 삭제
		if(reviewDraftId > 0) {
			reviewDraftService.deleteDraft(reviewDraftId);
		}

		// 저장 완료 후 메인 화면으로 이동
		return "redirect:/";
	}

	// 3) 게시글 상세보기
	@GetMapping("/review/{reviewId}")
	public String detail(@PathVariable("reviewId") int reviewId, Model model, HttpSession session) {
		// 같은 세션에서 이미 조회한 게시글이면 조회수를 다시 올리지 않음 (F5 새로고침 등)
		boolean increaseHit = isFirstViewInSession(session, reviewId);
		ReviewDTO review = reviewService.findById(reviewId, increaseHit);
		model.addAttribute("review", review);

		// 좋아요/북마크 버튼 초기 상태(로그인 상태일 때만 의미가 있음)
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		boolean liked = loginMember != null && reviewService.isLikedByMember(reviewId, loginMember.getMemberId());
		boolean bookmarked = loginMember != null && reviewService.isBookmarkedByMember(reviewId, loginMember.getMemberId());
		model.addAttribute("liked", liked);
		model.addAttribute("bookmarked", bookmarked);
		model.addAttribute("likeCount", reviewService.getLikeCount(reviewId));

		// 댓글/대댓글 목록 (로그인 상태면 좋아요 여부까지 함께 조회)
		Integer viewerMemberId = loginMember != null ? loginMember.getMemberId() : null;
		List<CommentDTO> comments = commentService.getComments(reviewId, viewerMemberId);
		model.addAttribute("comments", comments);
		// 대댓글의 대댓글까지 트리로 내려오므로 개수도 재귀적으로 집계
		model.addAttribute("commentCount", countComments(comments));

		// 베스트 댓글 미리보기(상위 3개, 좋아요 많은 순)
		List<CommentDTO> bestComments = comments.stream()
				.filter(CommentDTO::isBest)
				.sorted(Comparator.comparingInt(CommentDTO::getLikeCount).reversed())
				.collect(Collectors.toList());
		model.addAttribute("bestComments", bestComments);
		return "review/detail";
	}

	// 4) 게시글 수정 폼으로 이동 - 작성자 본인만 접근 가능
	@GetMapping("/review/{reviewId}/update")
	public String updateForm(@PathVariable("reviewId") int reviewId,
			@RequestParam(value="error", required=false) String error,
			Model model, HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return "redirect:/login";
		}

		// 수정 폼 진입은 실제 조회가 아니므로 조회수를 올리지 않음
		ReviewDTO review = reviewService.findById(reviewId, false);
		if (review.getMemberId() != loginMember.getMemberId()) {
			return "redirect:/review/" + reviewId;
		}
		model.addAttribute("review", review);
		model.addAttribute("genres", genreCategoryService.getAllGenres());
		model.addAttribute("likeCount", reviewService.getLikeCount(reviewId));
		model.addAttribute("commentCount", countComments(commentService.getComments(reviewId, null)));
		// 장르 칩 모달에서 이미 선택돼있던 장르를 미리 체크 표시하기 위한 id 집합
		model.addAttribute("selectedGenreIds", review.getGenreList().stream()
				.map(GenreCategoryDTO::getGenreCategoryId)
				.collect(Collectors.toSet()));

		// 금칙어 포함으로 수정이 막혀 되돌아온 경우 안내 문구 표시
		if ("badword".equals(error)) {
			model.addAttribute("badWordError", "금칙어가 포함되어 있어 수정할 수 없습니다. 내용을 수정한 후 다시 시도해주세요.");
		}

		return "review/update";
	}

	// 5) 게시글 수정 처리 - 작성자 본인만 가능 (검증은 ReviewService에서)
	@PostMapping("/review/{reviewId}/update")
	public String update(@PathVariable("reviewId") int reviewId, ReviewDTO reviewDTO, HttpSession session,
			@RequestParam(value="genreCategoryIds", required=false) List<Integer> genreCategoryIds) throws IOException {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return "redirect:/login";
		}
		reviewDTO.setReviewId(reviewId);

		if (reviewDTO.getImgFile() != null && !reviewDTO.getImgFile().isEmpty()) {
			// 새 이미지를 첨부한 경우에만 저장하고 교체 (미첨부 시 ReviewService에서 기존 이미지 유지)
			reviewDTO.setReviewImg(saveFile(reviewDTO.getImgFile()));
		}

		try {
			reviewService.update(reviewDTO, genreCategoryIds, loginMember.getMemberId());
		} catch (BadWordDetectedException e) {
			return "redirect:/review/" + reviewId + "/update?error=badword";
		} catch (IllegalStateException e) {
			return "redirect:/review/" + reviewId;
		}

		return "redirect:/review/" + reviewId;
	}

	// 6) 게시글 삭제 - 작성자 본인만 가능 (하드 삭제)
	@DeleteMapping("/review/{reviewId}")
	@ResponseBody
	public ResponseEntity<Void> delete(@PathVariable("reviewId") int reviewId, HttpSession session) {
		MemberDTO loginMember = (MemberDTO) session.getAttribute("loginMember");
		if (loginMember == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		try {
			reviewService.delete(reviewId, loginMember.getMemberId());
			return ResponseEntity.noContent().build();
		} catch (ReviewNotFoundException e) {
			return ResponseEntity.notFound().build();
		} catch (IllegalStateException e) {
			return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
		}
	}

	// 좋아요 토글
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

	// 북마크 토글
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

	// 게시글 신고 등록
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

	// 신고 등록 요청 바디 - { reason, content }
	@Data
	static class ReportRequest {
		private String reason;
		private String content;
	}

	// 댓글 트리(대댓글의 대댓글 포함) 전체 개수를 재귀적으로 집계
	private int countComments(List<CommentDTO> comments) {
		int count = 0;
		for (CommentDTO c : comments) {
			count += 1 + countComments(c.getReplies());
		}
		return count;
	}

	// 세션에 이 게시글을 조회한 이력이 있는지 확인
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
		String savedName = UUID.randomUUID().toString() + ext;
		
		File uploadDir = new File(uploadPath);
		if(!uploadDir.exists()) {
			uploadDir.mkdirs();
		}
		
		Path savePath = Paths.get(uploadPath + savedName);
		Files.copy(file.getInputStream(), savePath);
		
		return savedName;
	}
}