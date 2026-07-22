package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youflex.dto.BookmarkDTO;
import com.youflex.dto.PageInfo;
import com.youflex.dto.ReviewDTO;
import com.youflex.dto.ReviewLikeDTO;
import com.youflex.dto.ReviewReportDTO;
import com.youflex.exception.ReviewNotFoundException;
import com.youflex.mapper.BookmarkMapper;
import com.youflex.mapper.CommentMapper;
import com.youflex.mapper.ReviewDraftMapper;
import com.youflex.mapper.ReviewLikeMapper;
import com.youflex.mapper.ReviewMapper;
import com.youflex.mapper.ReviewReportMapper;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReviewService {

	private static final int MY_REVIEWS_PAGE_SIZE = 5;
	private static final int MY_BOOKMARKS_PAGE_SIZE = 5;
	private static final int LIKE_REWARD_MILESTONE_STEP = 5; // 좋아요 몇 개 단위로 지급할지
	private static final int LIKE_REWARD_POINT_AMOUNT = 5;   // 마일스톤 도달 시 지급할 포인트

	private final ReviewMapper reviewMapper;
	private final CommentMapper commentMapper;
	// 좋아요, 북마크, 신고, 게시글 임시저장
	private final ReviewLikeMapper reviewLikeMapper;
	private final BookmarkMapper bookmarkMapper;
	private final ReviewReportMapper reviewReportMapper;
	private final ReviewDraftMapper reviewDraftMapper;
	private final PointService pointService;
	private final BadWordService badWordService;

//	1) 게시글 저장
	@Transactional
	public void write(ReviewDTO reviewDTO, List<Integer> genreCategoryIds) {
		// 금칙어가 포함되어 있으면 등록 자체를 막음 (제목/본문/관련 작품 모두 검사)
		badWordService.validateContent(reviewDTO.getReviewTitle());
		badWordService.validateContent(reviewDTO.getReviewContent());
		badWordService.validateContent(reviewDTO.getReviewRelated());

		// 1. 게시글 데이터 저장
		reviewMapper.write(reviewDTO);
		
		// 2. 장르를 선택했을 경우에만 매핑 테이블에 일괄 저장 진행
		if(genreCategoryIds != null && !genreCategoryIds.isEmpty()) {
			int generatedReviewId = reviewDTO.getReviewId();
			reviewMapper.insertReviewGenres(generatedReviewId, genreCategoryIds);
		}
	}
	
//	2) 전체 게시글 목록 조회
	public List<ReviewDTO> findAll(String keywor, int offset, int size){
		return reviewMapper.findAll(keywor, offset, size);
	}
	
//	+) 검색 결과 전체 개수 조회
	public int countAll(String keyword) {
		return reviewMapper.countAll(keyword);
	}
	
//	3) 게시글 상세 조회 (항상 조회수 증가)
	public ReviewDTO findById(int reviewId) {
		return findById(reviewId, true);
	}

//	3-1) 게시글 상세 조회 - increaseHit이 true일 때만 조회수 증가(F5 새로고침 등 중복 호출 시
//	     조회수가 무한정 올라가지 않도록 increaseHit 여부는 호출부(Controller)에서 판단해서 넘김
	public ReviewDTO findById(int reviewId, boolean increaseHit) {
		ReviewDTO review = reviewMapper.findById(reviewId);
		if (review == null) {
			throw new ReviewNotFoundException("존재하지 않는 게시글입니다. reviewId=" + reviewId);
		}
		if (increaseHit) {
			reviewMapper.increaseHit(reviewId);
			review.setReviewHit(review.getReviewHit() + 1);
		}
		review.setGenreList(reviewMapper.findGenresByReviewId(reviewId));
		return review;
	}
	
//	4) 게시글 수정 - 작성자 본인만 가능, 새 이미지 미첨부 시 기존 이미지 유지, 장르는 전체 삭제 후 재삽입
	@Transactional
	public void update(ReviewDTO reviewDTO, List<Integer> genreCategoryIds, int requesterMemberId) {
		ReviewDTO existing = reviewMapper.findById(reviewDTO.getReviewId());
		if (existing == null) {
			throw new ReviewNotFoundException("존재하지 않는 게시글입니다. reviewId=" + reviewDTO.getReviewId());
		}
		if (existing.getMemberId() != requesterMemberId) {
			throw new IllegalStateException("수정 권한이 없습니다.");
		}
		// 금칙어가 포함되어 있으면 수정도 막음 (필터 우회 방지, 제목/본문/관련 작품 모두 검사)
		badWordService.validateContent(reviewDTO.getReviewTitle());
		badWordService.validateContent(reviewDTO.getReviewContent());
		badWordService.validateContent(reviewDTO.getReviewRelated());

		// 새 이미지를 첨부하지 않았으면 기존 이미지를 그대로 유지
		if (reviewDTO.getReviewImg() == null) {
			reviewDTO.setReviewImg(existing.getReviewImg());
		}
		reviewMapper.update(reviewDTO);

		// 장르는 전체 삭제 후, 이번에 새로 선택한 장르만 다시 저장
		reviewMapper.deleteReviewGenres(reviewDTO.getReviewId());
		if (genreCategoryIds != null && !genreCategoryIds.isEmpty()) {
			reviewMapper.insertReviewGenres(reviewDTO.getReviewId(), genreCategoryIds);
		}
	}

//	5) 게시글 삭제 - 작성자 본인만 가능 (하드 삭제, FK CASCADE로 댓글/좋아요/북마크/장르매핑까지 함께 삭제됨)
	public void delete(int reviewId, int requesterMemberId) {
		ReviewDTO existing = reviewMapper.findById(reviewId);
		if (existing == null) {
			throw new ReviewNotFoundException("존재하지 않는 게시글입니다. reviewId=" + reviewId);
		}
		if (existing.getMemberId() != requesterMemberId) {
			throw new IllegalStateException("삭제 권한이 없습니다.");
		}
		reviewMapper.delete(reviewId);
	}


//	마이페이지 - 내 글 탭(5개씩 페이징). page는 1부터 시작.
	public List<ReviewDTO> getMyReviews(int memberId, int page) {
		int offset = PageInfo.of(page, MY_REVIEWS_PAGE_SIZE, 0).getOffset();
		return reviewMapper.findByMemberId(memberId, offset, MY_REVIEWS_PAGE_SIZE);
	}

	public int getMyReviewsTotalCount(int memberId) {
		return reviewMapper.countByMemberId(memberId);
	}

	public int getMyReviewsPageSize() {
		return MY_REVIEWS_PAGE_SIZE;
	}

//	6) 좋아요 토글 - 이미 눌렀으면 취소, 아니면 등록. 좋아요 수가 5의 배수(5, 10, 15...)에 새로
//	   도달할 때마다(자추 제외) 글쓴이에게 5포인트 지급 (예전엔 좋아요 1개당 즉시 1포인트였으나 대체됨).
//	   review.review_rewarded_like_count에 이미 지급한 마일스톤을 기록해두고 조건부 UPDATE로 갱신해서,
//	   좋아요 취소 -> 재좋아요 반복으로 같은 마일스톤이 중복 지급되지 않도록 막는다.
	@Transactional
	public LikeResult toggleLike(int reviewId, int memberId) {
		ReviewDTO review = reviewMapper.findById(reviewId);
		if (review == null) {
			throw new ReviewNotFoundException("존재하지 않는 게시글입니다. reviewId=" + reviewId);
		}
		boolean alreadyLiked = reviewLikeMapper.existsLike(reviewId, memberId) > 0;
		if (alreadyLiked) {
			reviewLikeMapper.deleteLike(reviewId, memberId);
		} else {
			reviewLikeMapper.insertLike(ReviewLikeDTO.builder().reviewId(reviewId).memberId(memberId).build());
		}
		int likeCount = reviewLikeMapper.countLikes(reviewId);

		if (!alreadyLiked && review.getMemberId() != memberId) {
			int milestone = (likeCount / LIKE_REWARD_MILESTONE_STEP) * LIKE_REWARD_MILESTONE_STEP;
			if (milestone > 0 && reviewMapper.updateRewardedLikeCount(reviewId, milestone) > 0) {
				pointService.awardPoints(review.getMemberId(), LIKE_REWARD_POINT_AMOUNT, "게시글 좋아요 " + milestone + "개 달성");
			}
		}
		return new LikeResult(!alreadyLiked, likeCount);
	}

//	이 회원이 이 게시글에 좋아요를 눌렀는지 여부 (상세 페이지 초기 렌더링용)
	public boolean isLikedByMember(int reviewId, int memberId) {
		return reviewLikeMapper.existsLike(reviewId, memberId) > 0;
	}

//	게시글의 전체 좋아요 수 (상세 페이지 초기 렌더링용)
	public int getLikeCount(int reviewId) {
		return reviewLikeMapper.countLikes(reviewId);
	}

//	7) 북마크 토글 - 이미 등록되어 있으면 취소, 아니면 등록 (포인트 지급 없음)
	@Transactional
	public boolean toggleBookmark(int reviewId, int memberId) {
		boolean alreadyBookmarked = bookmarkMapper.existsBookmark(reviewId, memberId) > 0;
		if (alreadyBookmarked) {
			bookmarkMapper.deleteBookmark(reviewId, memberId);
		} else {
			bookmarkMapper.insertBookmark(BookmarkDTO.builder().reviewId(reviewId).memberId(memberId).build());
		}
		return !alreadyBookmarked;
	}

//	이 회원이 이 게시글을 북마크했는지 여부 (상세 페이지 초기 렌더링용)
	public boolean isBookmarkedByMember(int reviewId, int memberId) {
		return bookmarkMapper.existsBookmark(reviewId, memberId) > 0;
	}

//	마이페이지 - 북마크 탭(5개씩 페이징). page는 1부터 시작.
	public List<BookmarkDTO> getMyBookmarks(int memberId, int page) {
		int offset = PageInfo.of(page, MY_BOOKMARKS_PAGE_SIZE, 0).getOffset();
		return bookmarkMapper.findByMemberId(memberId, offset, MY_BOOKMARKS_PAGE_SIZE);
	}

	public int getMyBookmarksTotalCount(int memberId) {
		return bookmarkMapper.countByMemberId(memberId);
	}

	public int getMyBookmarksPageSize() {
		return MY_BOOKMARKS_PAGE_SIZE;
	}

//	8) 게시글 신고 등록 (처리 상태는 DB 기본값 '접수', 실제 처리는 관리자 신고 관리 화면(AdminReportService)에서 진행)
	public void reportReview(int reviewId, int memberId, String reason, String content) {
		reviewReportMapper.insertReport(ReviewReportDTO.builder()
				.reviewId(reviewId)
				.memberId(memberId)
				.reviewReportReason(reason)
				.reviewReportContent(content)
				.build());
	}

	@Data
	@AllArgsConstructor
	public static class LikeResult {
		private boolean liked;
		private int likeCount;
	}
}