package com.youflex.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.youflex.dto.GenreCategoryDTO;
import com.youflex.dto.ReviewDTO;
import com.youflex.dto.ReviewListSearchDTO;

@Mapper
public interface ReviewListMapper {
	List<ReviewDTO> findList(ReviewListSearchDTO searchDTO);
    int countList(ReviewListSearchDTO searchDTO);
    List<GenreCategoryDTO> findAllGenres();
}
