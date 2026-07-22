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

// ===== 상세검색 안 "취향 선택" 버튼 -> 마이페이지와 같은 취향(장르) 선택 모달 =====
const MAX_LIST_GENRE_SELECT = 3;
const listGenreModal = document.getElementById('listGenreModalBackdrop');
const listGenreGrid = listGenreModal ? listGenreModal.querySelector('.genre-grid') : null;

// 검색 적용 시 사용할 선택된 장르 목록
let selectedListGenres = [];

document.getElementById('listTasteBtn').addEventListener('click', () => {
  listGenreModal.classList.add('open');
});
document.getElementById('listGenreCancelBtn').addEventListener('click', () => {
  listGenreModal.classList.remove('open');
});

// 장르 칩 클릭 시 선택/해제 토글 (최대 3개 제한)
if (listGenreGrid) {
  const listGenreChips = listGenreGrid.querySelectorAll('.genre-chip');

  listGenreChips.forEach((chip) => {
    // 모달 열 때 이전 선택 상태를 칩에 반영
    if (selectedListGenres.includes(chip.getAttribute('data-genre'))) {
      chip.classList.add('selected');
    }

    chip.addEventListener('click', () => {
      const selectedCount = listGenreGrid.querySelectorAll('.genre-chip.selected').length;

      if (!chip.classList.contains('selected') && selectedCount >= MAX_LIST_GENRE_SELECT) {
        alert(`관심 장르는 최대 ${MAX_LIST_GENRE_SELECT}개까지만 선택할 수 있어요.`);
        return;
      }

      chip.classList.toggle('selected');
    });
  });
}

document.getElementById('listGenreApplyBtn').addEventListener('click', () => {
  const selectedChips = listGenreGrid.querySelectorAll('.genre-chip.selected');
  selectedListGenres = Array.from(selectedChips).map(chip => chip.getAttribute('data-genre'));
  listGenreModal.classList.remove('open');
  // 장르 모달에서는 '적용'을 눌러도 바로 검색하지 않고, 값만 담아둠
  // (최종 검색 실행은 상세검색 패널의 "검색 적용" 버튼에서)
});

// ===== "검색 적용" 버튼: 키워드 + 기간 + 장르를 모두 모아 검색 요청 =====
const applySearchBtn = document.getElementById('applySearchBtn');
if (applySearchBtn) {
  applySearchBtn.addEventListener('click', () => {
    const keyword = document.getElementById('searchKeyword').value.trim();
    const period = document.getElementById('searchPeriod').value;

    goToFilteredList({ keyword, period, genres: selectedListGenres });
  });
}

const searchForm = document.getElementById('searchForm');
if (searchForm) {
  searchForm.addEventListener('submit', () => {
    const keyword = document.getElementById('searchKeyword').value.trim();
    const period = document.getElementById('searchPeriod') ? document.getElementById('searchPeriod').value : 'all';

    goToFilteredList({ keyword, period, genres: selectedListGenres });
  });
}

// ===== 공통: 현재 정렬/검색 조건을 쿼리 파라미터로 만들어 목록 페이지 재요청 =====
function goToFilteredList(overrides = {}) {
  const params = new URLSearchParams(window.location.search);

  // 검색/정렬 조건이 바뀌면 페이지는 1페이지로 초기화
  params.set('page', '1');

  if (overrides.sort !== undefined) params.set('sort', overrides.sort);
  if (overrides.keyword !== undefined) {
    if (overrides.keyword) params.set('keyword', overrides.keyword);
    else params.delete('keyword');
  }
  if (overrides.period !== undefined) {
    if (overrides.period && overrides.period !== 'all') params.set('period', overrides.period);
    else params.delete('period');
  }
  if (overrides.genres !== undefined) {
    if (overrides.genres.length > 0) params.set('genres', overrides.genres.join(','));
    else params.delete('genres');
  }

  window.location.href = `${window.location.pathname}?${params.toString()}`;
}