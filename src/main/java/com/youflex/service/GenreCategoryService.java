package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.youflex.dto.GenreCategoryDTO;
import com.youflex.mapper.GenreCategoryMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GenreCategoryService {

    private final GenreCategoryMapper genreCategoryMapper;

    public List<GenreCategoryDTO> getAllGenres() {
        return genreCategoryMapper.findAll();
    }
}
