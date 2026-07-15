package com.youflex.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.multipart.MultipartFile;

import com.youflex.dto.MemberDTO;
import com.youflex.dto.ReviewDTO;
import com.youflex.service.ReviewService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ReviewController {
//	중괄호 짝 찾기 : ctrl+shift+p
	
	private final ReviewService reviewService;
	
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
		return "review/write";
	}
	
//	2) 리뷰 글 작성
	@PostMapping("/review/write")
	public String write(ReviewDTO reviewDTO, HttpSession session) throws IOException{
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
		reviewService.write(reviewDTO);
		
//		저장 완료 후 메인 화면으로 이동
		return "redirect:/";
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
