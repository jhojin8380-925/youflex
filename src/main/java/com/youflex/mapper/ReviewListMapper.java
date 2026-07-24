package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.youflex.dto.ReviewDTO;
import com.youflex.dto.ReviewListSearchDTO;

@Mapper
public interface ReviewListMapper {
	List<ReviewDTO> findList(ReviewListSearchDTO searchDTO);
    int countList(ReviewListSearchDTO searchDTO);

    // 메인 화면 인기 리뷰글(플랫폼별 top N) - 좋아요 수 우선, 동률이면 별점 높은 순
    List<ReviewDTO> findPopular(@Param("platform") String platform, @Param("limit") int limit);
}
