document.getElementById('advToggleBtn').addEventListener('click', () => {
    document.getElementById('advPanel').classList.toggle('open');
});

// ===== 정렬 버튼: 클릭 시 sort 파라미터를 붙여 목록 재요청 =====
document.querySelectorAll('.sort-group button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sort-group button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        goToFilteredList({ sort: btn.dataset.sort });
    });
});

// ===== [1] 장르 선택 모달 및 최대 3개 제한 로직 =====
const MAX_GENRE_SELECT = 3;
const tasteBtn = document.getElementById('listTasteBtn');           // 상세검색 > 취향선택 버튼
const genreModal = document.getElementById('genreModalBackdrop');   // 모달창 배경
const genreGrid = document.getElementById('genreGrid');             // 장르 칩 그리드
const genreSkipBtn = document.getElementById('genreSkipBtn');       // 취소 버튼
const genreDoneBtn = document.getElementById('genreDoneBtn');       // 저장 버튼
let selectedListGenres = [];	// 파일 상단에 변수 선언 추가

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
                alert(`관심 장르는 최대 ${MAX_GENRE_SELECT}개까지만 선택할 수 있어요.`);
                return;
            }

            chip.classList.toggle('selected');
        });
    });
}

// 4. 저장 완료 버튼 클릭 시 처리
if (genreDoneBtn && genreModal) {
    genreDoneBtn.addEventListener('click', () => {
        const selectedChips = genreGrid.querySelectorAll('.genre-chip.selected');
        const selectedGenres = [];

        selectedChips.forEach(chip => {
            selectedGenres.push({
                id: chip.getAttribute('data-genre-id'),
                name: chip.querySelector('span').textContent.trim()
            });
        });

        const form = document.getElementById('reviewForm');
        if (form) {
            form.querySelectorAll('input[name="genreCategoryIds"]').forEach(el => el.remove());

            selectedGenres.forEach(genre => {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'genreCategoryIds';
                hiddenInput.value = genre.id;
                form.appendChild(hiddenInput);
            });
        } else {
            // 목록 페이지(상세검색)에는 reviewForm이 없으므로,이 else 분기에서 선택한 장르 id를 selectedListGenres 배열에 저장
            // 목록 페이지(상세검색) : 검색 조건 배열에 저장
            selectedListGenres = selectedGenres.map(g => g.id);
        }

        genreModal.classList.remove('open');
    });
}

// ===== "검색 적용" 버튼: 키워드 + 기간 + 장르를 모두 모아 검색 요청 =====
const applySearchBtn = document.getElementById('applySearchBtn');
if (applySearchBtn) {
    applySearchBtn.addEventListener('click', () => {
        const keyword = document.getElementById('searchKeyword').value.trim();
        const period = document.getElementById('searchPeriod').value;

        // [수정] genres -> genreCategoryIds : ReviewListSearchDTO 필드명과 일치시킴 (파라미터명 불일치로 서버 바인딩 안 되던 문제)
        goToFilteredList({ keyword, period, genreCategoryIds: selectedListGenres });
    });
}

const searchForm = document.getElementById('searchForm');
if (searchForm) {
    searchForm.addEventListener('submit', () => {
        const keyword = document.getElementById('searchKeyword').value.trim();
        const period = document.getElementById('searchPeriod') ? document.getElementById('searchPeriod').value : 'all';

        // [수정] genres -> genreCategoryIds : ReviewListSearchDTO 필드명과 일치시킴 (파라미터명 불일치로 서버 바인딩 안 되던 문제)
        goToFilteredList({ keyword, period, genreCategoryIds: selectedListGenres });
    });
}

// ===== 공통: 현재 정렬/검색 조건을 쿼리 파라미터로 만들어 목록 페이지 재요청 =====
function goToFilteredList(overrides = {}) {
    const params = new URLSearchParams(window.location.search);

    // 검색/정렬 조건이 바뀌면 페이지는 1페이지로 초기화
    params.set('page', '1');
    if (overrides.page !== undefined) params.set('page', String(overrides.page));

    if (overrides.sort !== undefined) params.set('sort', overrides.sort);
    if (overrides.keyword !== undefined) {
        if (overrides.keyword) params.set('keyword', overrides.keyword);
        else params.delete('keyword');
    }
    if (overrides.period !== undefined) {
        if (overrides.period && overrides.period !== 'all') params.set('period', overrides.period);
        else params.delete('period');
    }

    // [수정] overrides.genres -> overrides.genreCategoryIds 로 변경
    // [수정] 콤마로 합친 문자열 하나(set) 대신, 같은 이름의 파라미터를 여러 개(append) 붙이는 방식으로 변경
    //        -> Spring이 List<Integer> genreCategoryIds 로 안전하게 바인딩하도록 하기 위함
    //        (기존 방식인 params.set('genres', arr.join(',')) 는 파라미터명도 틀렸고,
    //         콤마 문자열 하나로는 List<Integer> 바인딩이 보장되지 않음)
    if (overrides.genreCategoryIds !== undefined) {
        params.delete('genreCategoryIds'); // 기존 값 초기화 후 다시 채움
        if (overrides.genreCategoryIds.length > 0) {
            overrides.genreCategoryIds.forEach(id => params.append('genreCategoryIds', id));
        }
    }
	
	window.location.href = `${window.location.pathname}?${params.toString()}`;

	document.addEventListener('click', (event) => {
	    const button = event.target.closest('button.page-btn');
	    if (!button || button.disabled) return;
	    if (!button.closest('.pagination')) return;

	    const pageText = button.textContent.trim();
	    const currentPage = Number(new URLSearchParams(window.location.search).get('page') || '1');
	    const totalPages = Number(button.closest('.pagination').dataset.totalPages || '0');

	    if (pageText === '‹') {
	        if (currentPage > 1) goToFilteredList({ page: currentPage - 1 });
	        return;
	    }

	    if (pageText === '›') {
	        if (currentPage < totalPages) goToFilteredList({ page: currentPage + 1 });
	        return;
	    }

	    const pageNumber = Number(pageText);
	    if (!Number.isNaN(pageNumber) && pageNumber <= totalPages) {
	        goToFilteredList({ page: pageNumber });
	    }
	});
}