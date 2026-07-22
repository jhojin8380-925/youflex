package com.youflex.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.youflex.dto.BadWordDTO;
import com.youflex.exception.BadWordDetectedException;
import com.youflex.mapper.BadWordMapper;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

/**
 * 금칙어(비속어) 필터 관련 비즈니스 로직
 * - 리뷰/댓글/Q&A 작성 시 본문에 금칙어가 포함되어 있으면 등록 자체를 막는 데 사용
 * - 매 작성마다 DB를 조회하지 않도록 단어 목록을 메모리에 캐싱해두고,
 *   관리자가 단어를 등록/삭제할 때만 다시 불러옴
 */
@Service
@RequiredArgsConstructor
public class BadWordService {

    private final BadWordMapper badWordMapper;

    private volatile List<String> cachedBadWords = List.of();

    @PostConstruct
    public void init() {
        refreshCache();
    }

    private void refreshCache() {
        cachedBadWords = badWordMapper.selectBadWordList().stream()
                .map(BadWordDTO::getBadWordContent)
                .toList();
    }

    /**
     * 관리자 페이지용 금칙어 목록 조회 (항상 DB 최신값)
     */
    public List<BadWordDTO> getBadWordList() {
        return badWordMapper.selectBadWordList();
    }

    /**
     * 본문에 금칙어가 포함되어 있으면 등록을 막기 위해 예외를 던짐
     * @param content 검사할 본문 (리뷰/댓글/Q&A 내용)
     * @throws BadWordDetectedException 금칙어가 하나라도 포함된 경우
     */
    public void validateContent(String content) {
        if (content == null) {
            return;
        }
        boolean detected = cachedBadWords.stream().anyMatch(content::contains);
        if (detected) {
            throw new BadWordDetectedException("금칙어가 포함되어 있어 등록할 수 없습니다.");
        }
    }

    /**
     * 금칙어 등록 (관리자 전용)
     */
    public void registerBadWord(String badWordContent) {
        badWordMapper.insertBadWord(BadWordDTO.builder().badWordContent(badWordContent).build());
        refreshCache();
    }

    /**
     * 금칙어 삭제 (관리자 전용)
     */
    public void removeBadWord(int badWordId) {
        badWordMapper.deleteBadWord(badWordId);
        refreshCache();
    }
}
