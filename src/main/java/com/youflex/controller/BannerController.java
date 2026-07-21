package com.youflex.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.youflex.dto.BannerDTO;
import com.youflex.dto.MemberDTO;
import com.youflex.service.BannerService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

/**
 * 배너(메인 화면 상단 히어로 배너) 관련 API 컨트롤러
 * - 목록 조회는 전체 사용자 대상, 등록/수정/삭제는 관리자 전용
 */
@RestController
@RequestMapping("/api/banner")
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;

    // ReviewController와 동일한 파일 업로드 방식(youflex.upload.path에 UUID 파일명으로 저장)
    @Value("${youflex.upload.path}")
    private String uploadPath;

    @GetMapping
    public ResponseEntity<List<BannerDTO>> getBannerList() {
        return ResponseEntity.ok(bannerService.getBannerList());
    }

    @PostMapping
    public ResponseEntity<?> createBanner(BannerDTO bannerDTO, HttpSession session) throws IOException {
        if (!isAdmin(session)) {
            return forbidden();
        }
        if (bannerDTO.getBannerImgFile() == null || bannerDTO.getBannerImgFile().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "배너 이미지를 첨부해주세요."));
        }
        bannerDTO.setBannerImg(saveFile(bannerDTO.getBannerImgFile()));
        bannerService.createBanner(bannerDTO);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/{bannerId}")
    public ResponseEntity<?> updateBanner(@PathVariable("bannerId") int bannerId,
                                           BannerDTO bannerDTO, HttpSession session) throws IOException {
        if (!isAdmin(session)) {
            return forbidden();
        }
        bannerDTO.setBannerId(bannerId);
        if (bannerDTO.getBannerImgFile() != null && !bannerDTO.getBannerImgFile().isEmpty()) {
            bannerDTO.setBannerImg(saveFile(bannerDTO.getBannerImgFile()));
        } else {
            bannerDTO.setBannerImg(null); // 서비스단에서 기존 파일명 유지 여부 판단
        }
        bannerService.updateBanner(bannerDTO);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{bannerId}")
    public ResponseEntity<?> deleteBanner(@PathVariable("bannerId") int bannerId, HttpSession session) {
        if (!isAdmin(session)) {
            return forbidden();
        }
        bannerService.deleteBanner(bannerId);
        return ResponseEntity.noContent().build();
    }

    // 파일 실제 저장 - ReviewController.saveFile과 동일한 패턴(UUID 파일명, uploadPath 폴더에 저장)
    private String saveFile(org.springframework.web.multipart.MultipartFile file) throws IOException {
        String originalName = file.getOriginalFilename();
        String ext = originalName.substring(originalName.lastIndexOf("."));
        String savedName = UUID.randomUUID().toString() + ext;

        File uploadDir = new File(uploadPath);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        Path savePath = Paths.get(uploadPath, savedName);
        Files.copy(file.getInputStream(), savePath);
        return savedName;
    }

    // 세션의 로그인 회원이 관리자 등급인지 확인 (memberGrade == '관리자')
    private boolean isAdmin(HttpSession session) {
        Object loginMemberObj = session.getAttribute("loginMember");
        return loginMemberObj instanceof MemberDTO loginMember
                && "관리자".equals(loginMember.getMemberGrade());
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "관리자만 접근할 수 있습니다."));
    }
}
