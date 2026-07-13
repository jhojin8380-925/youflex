document.getElementById('submitBtn').addEventListener('click', () => {
  if (!document.getElementById('review_title').value.trim()) {
    alert('제목을 입력해주세요.');
    return;
  }
  alert('게시글이 수정되었습니다. (데모)');
  location.href = '13_detail.html';
});

// ===== 취향 선택(웅조)
// 취향(관심 장르) 선택
document.getElementById('tasteBtn').addEventListener('click', () => {
  document.getElementById('genreModalBackdrop').classList.add('open');
});
document.getElementById('genreCancelBtn').addEventListener('click', () => {
  document.getElementById('genreModalBackdrop').classList.remove('open');
});
document.getElementById('genreSaveBtn').addEventListener('click', () => {
  document.getElementById('genreModalBackdrop').classList.remove('open');
  alert('취향이 저장되었습니다. (데모)');
});

// ===== 별점 클릭 처리 (0.5점 단위 수정) ===============
const starBoxes = document.querySelectorAll(".star-box");
const ratingInput = document.querySelector("input[name='postRating']");
const allHalves = document.querySelectorAll(".star-box .half");

// 현재 평점(score)에 맞춰서 모든 반 칸 별의 색상을 업데이트하는 함수
function updateStars(score) {
  allHalves.forEach((half) => {
    const parentBox = half.closest(".star-box");
    const boxValue = parseFloat(parentBox.getAttribute("data-value"));
    
    // 왼쪽 반 칸은 (부모값 - 0.5) 점수를 의미함
    if (half.classList.contains("left")) {
      if (boxValue - 0.5 <= score) {
        half.classList.add("active");
      } else {
        half.classList.remove("active");
      }
    } 
    // 오른쪽 반 칸은 부모값 전체 점수를 의미함
    else if (half.classList.contains("right")) {
      if (boxValue <= score) {
        half.classList.add("active");
      } else {
        half.classList.remove("active");
      }
    }
  });
}

// 초기 화면 로드 시 hidden input에 적힌 점수대로 별 표시
updateStars(parseFloat(ratingInput.value || 0));

allHalves.forEach((half) => {
  // 해당 반 칸이 의미하는 정확한 점수 계산
  const parentBox = half.closest(".star-box");
  const boxValue = parseFloat(parentBox.getAttribute("data-value"));
  const currentHalfScore = half.classList.contains("left") ? boxValue - 0.5 : boxValue;

  // 1. 클릭 시 점수 확정
  half.addEventListener("click", () => {
    ratingInput.value = currentHalfScore;
    updateStars(currentHalfScore);
    console.log("확정된 별점:", ratingInput.value);
  });

  // 2. 마우스 올리면 해당 점수까지 미리보기 + 폭죽 효과 발생!
  half.addEventListener("mouseover", () => {
    updateStars(currentHalfScore);
    // 마우스가 닿은 대상(half)을 매개변수로 넘겨 폭죽 가동
    createStarFireworks(half); 
  });

  // 3. 마우스가 벗어나면 기존에 확정됐던 점수로 복구
  half.addEventListener("mouseout", () => {
    const confirmedScore = parseFloat(ratingInput.value || 0);
    updateStars(confirmedScore);
  });
});

// ★ 폭죽 이펙트를 생성하는 새로운 핵심 함수 ★
function createStarFireworks(element) {
  // 마우스가 올라간 별 요소를 기준으로 화면 절대 좌표(기하 구조) 계산
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // 폭죽 조각 개수 설정 (8개~10개 정도가 가장 깔끔합니다)
  const particleCount = 8;
  // 화려함을 더해줄 네온 컬러풀 색상 리스트
  const colors = ['#f39c12', '#ffe066', '#ff6b6b', '#BAE6FD', '#4ade80'];

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'star-particle';

    // 무작위 색상 및 크기 지정
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomSize = Math.random() * 4 + 4; // 4px ~ 8px
    particle.style.backgroundColor = randomColor;
    particle.style.width = `${randomSize}px`;
    particle.style.height = `${randomSize}px`;

    // 폭죽이 터지기 시작할 중심부 시작 위치 지정
    particle.style.left = `${centerX - randomSize / 2}px`;
    particle.style.top = `${centerY - randomSize / 2}px`;

    // 각 조각이 사방으로 퍼져나갈 랜덤 각도와 거리 계산
    const angle = (i * (360 / particleCount) + Math.random() * 20) * (Math.PI / 180);
    const distance = Math.random() * 35 + 25; // 퍼지는 반경 (25px ~ 60px)
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    // CSS 애니메이션 변수로 전달
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);

    document.body.appendChild(particle);

    // 애니메이션이 끝나면 DOM에서 깔끔하게 삭제 (메모리 관리)
    particle.addEventListener('animationend', () => {
      particle.remove();
    });
  }
}

// ===== 사진 업로드 미리보기 수정(웅조)===== 
		// [1] 파일 선택칸과 미리보기 이미지를 가져온다
		const imgInput = document.getElementById('imgInput');    // <input type="file">
		const imgPreview = document.getElementById('imgPreview');  // 미리보기 <img>

		// [2] 파일을 선택하면(change) 그 사진을 화면에 미리 보여준다
		imgInput.addEventListener('change', function () {
			const file = imgInput.files[0];               // 선택한 파일 (없으면 undefined)
			if (!file) return;

			const reader = new FileReader();              // 파일을 화면에 쓸 수 있는 형태로 읽는 도구
			reader.onload = function (e) {
				imgPreview.src = e.target.result;         // 읽어들인 이미지를 미리보기에 넣음
				imgPreview.style.display = 'block';       // 숨겨둔 미리보기를 보이게 함
			};
			reader.readAsDataURL(file);                   // 파일 읽기 시작
		});