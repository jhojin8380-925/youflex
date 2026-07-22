// ===== [1] 장르 선택 모달 및 최대 3개 제한 로직 (write.js와 동일한 방식, 기존 선택값만 서버에서 미리 채워옴) =====
const MAX_GENRE_SELECT = 3;
const tasteBtn = document.getElementById('tasteBtn');               // ❤️ 관련 장르 버튼
const genreModal = document.getElementById('genreModalBackdrop');   // 모달창 배경
const genreGrid = document.getElementById('genreGrid');             // 장르 칩 그리드
const genreSkipBtn = document.getElementById('genreSkipBtn');       // 취소 버튼
const genreDoneBtn = document.getElementById('genreDoneBtn');       // 저장 버튼

// 1. 장르 선택 모달 열기
if (tasteBtn && genreModal) {
    tasteBtn.addEventListener('click', () => {
        genreModal.classList.add('open');
    });
}

// 2. 장르 선택 모달 닫기 (취소 클릭 시)
if (genreSkipBtn && genreModal) {
    genreSkipBtn.addEventListener('click', () => {
        genreModal.classList.remove('open');
    });
}

// 3. 장르 칩 클릭 이벤트 핸들러 (최대 3개 제한 핵심 로직)
if (genreGrid) {
    const genreChips = genreGrid.querySelectorAll('.genre-chip');

    genreChips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const selectedCount = genreGrid.querySelectorAll('.genre-chip.selected').length;

            if (!chip.classList.contains('selected') && selectedCount >= MAX_GENRE_SELECT) {
                alert(`관련 장르는 최대 ${MAX_GENRE_SELECT}개까지만 선택할 수 있어요.`);
                return;
            }

            chip.classList.toggle('selected');
        });
    });
}

// 4. 저장 버튼 클릭 시, 선택된 칩을 기준으로 폼에 실어보낼 hidden input을 다시 구성
//    (서버에서 미리 렌더링해둔 기존 장르 hidden input도 이때 전부 지워지고 새로 채워짐)
if (genreDoneBtn && genreModal) {
    genreDoneBtn.addEventListener('click', () => {
        const selectedChips = genreGrid.querySelectorAll('.genre-chip.selected');

        const form = document.getElementById('reviewUpdateForm');
        if (form) {
            form.querySelectorAll('input[name="genreCategoryIds"]').forEach((el) => el.remove());

            selectedChips.forEach((chip) => {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'genreCategoryIds';
                hiddenInput.value = chip.getAttribute('data-genre-id');
                form.appendChild(hiddenInput);
            });
        }

        genreModal.classList.remove('open');
    });
}


// ===== [2] 별점 클릭 처리 (0.5점 단위 + 폭죽 이펙트) =====
const starBoxes = document.querySelectorAll(".star-box");
const ratingInput = document.querySelector("input[name='reviewRating']");
const allHalves = document.querySelectorAll(".star-box .half");

function updateStars(score) {
    allHalves.forEach((half) => {
        const parentBox = half.closest(".star-box");
        const boxValue = parseFloat(parentBox.getAttribute("data-value"));

        if (half.classList.contains("left")) {
            if (boxValue - 0.5 <= score) {
                half.classList.add("active");
            } else {
                half.classList.remove("active");
            }
        }
        else if (half.classList.contains("right")) {
            if (boxValue <= score) {
                half.classList.add("active");
            } else {
                half.classList.remove("active");
            }
        }
    });
}

if (ratingInput) {
    updateStars(parseFloat(ratingInput.value || 0));
}

allHalves.forEach((half) => {
    const parentBox = half.closest(".star-box");
    const boxValue = parseFloat(parentBox.getAttribute("data-value"));
    const currentHalfScore = half.classList.contains("left") ? boxValue - 0.5 : boxValue;

    half.addEventListener("click", () => {
        ratingInput.value = currentHalfScore;
        updateStars(currentHalfScore);
    });

    half.addEventListener("mouseover", () => {
        updateStars(currentHalfScore);
        createStarFireworks(half);
    });

    half.addEventListener("mouseout", () => {
        const confirmedScore = parseFloat(ratingInput.value || 0);
        updateStars(confirmedScore);
    });
});

function createStarFireworks(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const particleCount = 8;
    const colors = ['#f39c12', '#ffe066', '#ff6b6b', '#BAE6FD', '#4ade80'];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'star-particle';

        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomSize = Math.random() * 4 + 4;
        particle.style.backgroundColor = randomColor;
        particle.style.width = `${randomSize}px`;
        particle.style.height = `${randomSize}px`;

        particle.style.left = `${centerX - randomSize / 2}px`;
        particle.style.top = `${centerY - randomSize / 2}px`;

        const angle = (i * (360 / particleCount) + Math.random() * 20) * (Math.PI / 180);
        const distance = Math.random() * 35 + 25;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        document.body.appendChild(particle);

        particle.addEventListener('animationend', () => {
            particle.remove();
        });
    }
}


// ===== [3] 사진 업로드 미리보기 (새 파일을 고르면 기존 대표이미지 미리보기를 교체) =====
const imgInput = document.getElementById('imgInput');
const imgPreview = document.getElementById('imgPreview');

if (imgInput && imgPreview) {
    imgInput.addEventListener('change', () => {
        const file = imgInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            imgPreview.src = e.target.result;
            imgPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
}
