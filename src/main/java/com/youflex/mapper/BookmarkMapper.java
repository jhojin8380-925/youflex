package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.BookmarkDTO;

@Mapper
public interface BookmarkMapper {

    // 이 회원이 이미 이 게시글을 북마크했는지 확인 (1인 1회 제한 - bookmark 테이블과 짝을 이룸)
    int existsBookmark(@Param("reviewId") int reviewId, @Param("memberId") int memberId);

    // 북마크 등록
    void insertBookmark(BookmarkDTO bookmarkDTO);

    // 북마크 취소
    void deleteBookmark(@Param("reviewId") int reviewId, @Param("memberId") int memberId);

    // 마이페이지 - 북마크 탭: 내가 북마크한 글만 최신순 페이징 조회(게시글 제목/이미지/작성자 join)
    List<BookmarkDTO> findByMemberId(@Param("memberId") int memberId,
            @Param("offset") int offset,
            @Param("size") int size);

    // 마이페이지 - 북마크 탭 총 개수(페이지네이션 계산용)
    int countByMemberId(@Param("memberId") int memberId);
}
