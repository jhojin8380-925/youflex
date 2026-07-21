//const DRAFT_KEY = 'youflex_write_drafts';

function getDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY)) || [];
  } catch {
    return [];
  }
}
function setDrafts(drafts) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

const DRAFT_KEY = 'youflex_write_drafts';

// ===== [1] 장르 선택 모달 및 최대 3개 제한 로직 =====
const MAX_GENRE_SELECT = 3;
const tasteBtn = document.getElementById('tasteBtn');               // ❤️ 관련 장르 버튼
const genreModal = document.getElementById('genreModalBackdrop');   // 모달창 배경
const genreGrid = document.getElementById('genreGrid');             // 장르 칩 그리드
const genreSkipBtn = document.getElementById('genreSkipBtn');       // 취소 버튼
const genreDoneBtn = document.getElementById('genreDoneBtn');       // 저장 버튼

// 1. 장르 선택 모달 열기
if (tasteBtn && genreModal) {
  tasteBtn.addEventListener('click', () => {
    genreModal.classList.add('open');	/*common.css에 .genre-modal-backdrop.open와 관련됨*/
  });
}

// 2. 장르 선택 모달 닫기 (취소 클릭 시)
if (genreSkipBtn && genreModal) {
  genreSkipBtn.addEventListener('click', () => {
    genreModal.classList.remove('open');	/*common.css에 .genre-modal-backdrop.open와 관련됨*/
  });
}

// 3. 장르 칩 클릭 이벤트 핸들러 (최대 3개 제한 핵심 로직)
if (genreGrid) {
  // Thymeleaf로 렌더링된 button.genre-chip 요소들 타겟팅
  const genreChips = genreGrid.querySelectorAll('.genre-chip');
  
  genreChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      // 현재 선택된 장르 개수 파악
      const selectedCount = genreGrid.querySelectorAll('.genre-chip.selected').length;
      
      // 이미 3개 선택했는데 추가로 더 누르려 하면 경고 후 이벤트 블로킹
      if (!chip.classList.contains('selected') && selectedCount >= MAX_GENRE_SELECT) {
        alert(`관심 장르는 최대 ${MAX_GENRE_SELECT}개까지만 선택할 수 있어요.`);
        return;
      }
      
      // 3개 미만이거나 기존에 선택된 것을 취소할 때는 토글 정상 작동
      chip.classList.toggle('selected');
    });
  });
}

// 4. 저장 완료 버튼 클릭 시 처리 (버튼 텍스트 변경 로직 제외)
if (genreDoneBtn && genreModal) {
  genreDoneBtn.addEventListener('click', () => {
    const selectedChips = genreGrid.querySelectorAll('.genre-chip.selected');	/*.selected가 붙어 있는 칩들만 찾아서 selectedChips에 담는다.*/
    const selectedGenres = [];	/*선택된 장르의 정보를 저장할 배열 생성*/
    
    selectedChips.forEach(chip => {
      // th:attr="data-genre-id=${genre.genreCategoryId}" 로 입력된 id 추출
      selectedGenres.push({
        id: chip.getAttribute('data-genre-id'),
        name: chip.querySelector('span').textContent.trim()
      });
    });

    // ----------------------------------------------------
    // [수정 💥] '❤️ 관련 장르' 버튼의 텍스트를 바꾸는 코드를 삭제했습니다.
    // 이제 장르를 선택하고 저장해도 화면의 버튼명은 변함없이 "❤️ 관련 장르"로 고정됩니다.
    // ----------------------------------------------------

    // [중요 🌟] 스프링 부트로 선택 장르 ID들을 안전하게 넘겨주기 위한 hidden input 세팅
    const form = document.getElementById('reviewForm');
    if (form) {
      // 매번 새로 저장할 때 기존에 삽입되었던 장르 hidden tags 삭제하여 중복 방지
      form.querySelectorAll('input[name="genreCategoryIds"]').forEach(el => el.remove());

      // 선택한 장르 개수(최대 3개)만큼 hidden input을 생성하여 전송 폼에 주입
      selectedGenres.forEach(genre => {
        const hiddenInput = document.createElement('input');	/*input태그 생성*/
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'genreCategoryIds'; // Controller에서 받을 List<Integer> 필드명
        hiddenInput.value = genre.id;
        form.appendChild(hiddenInput);
      });
    }

    // 모달창 닫기
    genreModal.classList.remove('open');
    
    // 사용자에게 직관적으로 저장되었음을 알리는 가벼운 피드백 (선택사항)
    alert(`선택하신 ${selectedGenres.length}개의 장르가 임시 매핑되었습니다.`);
  });
}


// ===== [2] 별점 클릭 처리 (0.5점 단위 + 폭죽 이펙트) ===============
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

// 초기 로딩 시 기본 설정값으로 업데이트
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
	console.log("확정된 별점 : ", ratingInput.value);
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

// 호버링 폭죽 이펙트
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


// ===== [3] 사진 업로드 미리보기 ===== 
const imgInput = document.getElementById('imgInput');    
const imgPreview = document.getElementById('imgPreview');  

if (imgInput && imgPreview) {
  imgInput.addEventListener('change', function () {
    const file = imgInput.files[0];               
    if (!file) {
      imgPreview.style.display = 'none';
      return;
    }

    const reader = new FileReader();              
    reader.onload = function (e) {
      imgPreview.src = e.target.result;         
      imgPreview.style.display = 'block'; 
    };
    reader.readAsDataURL(file);                   
  });
}


// ===== [4] 서버 DB 기반 임시저장 관리 기능 =====

// 페이지 로드 시 임시저장 목록 불러오기 실행 및 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
  fetchDraftList();

  /* ====== 게시글 임시저장 클릭 이벤트 ======*/
  const draftBtn = document.getElementById('draftBtn');
  if (draftBtn) {
    draftBtn.addEventListener('click', () => {
      const titleInput = document.getElementById('review_title');
      const contentInput = document.getElementById('review_content');
      const reviewRelatedInput = document.getElementById('review_related');
      
      const title = titleInput ? titleInput.value.trim() : '';
      const content = contentInput ? contentInput.value.trim() : '';
      const reviewRelated = reviewRelatedInput ? reviewRelatedInput.value.trim() : '';
      
      if (!title && !content) {
        alert('제목이나 내용 중 하나 이상 입력 후 임시저장해 주세요.');
        return;
      }

      /*new FormData() : HTML폼 전송 데이터를 자바스크립트 객체 형태로 쉽게 만들 수 있게 해주는 기능.*/
      const formData = new FormData();
      formData.append('reviewDraftTitle', title);	/*데이터 추가 : append(key, value)*/
      formData.append('reviewDraftContent', content);
      formData.append('reviewDraftRelated', reviewRelated);
	  console.log(formData);

      fetch('/review/draft/save', {	/* 브라우저 내장 비동기 http 요청 함수 */
        method: 'POST',
        body: formData
      })
      .then(async response => {
        /*401 : 로그인하지 않은 사용자가 접근했을 때 리턴하도록 설정된 에러 코드*/
        if (response.status === 401) {
          alert('로그인이 필요한 기능입니다.');
          return;
        }
		
		const restText = await response.text();
		
        if (response.ok && restText === 'SUCCESS') {
          // 저장 성공 시 현재 시각 표시 (예 : 15:55)
          const now = new Date();	/*new Date() : 현재 날짜와 시간 정보를 가지고 있는 내장 객체*/
          const hh = String(now.getHours()).padStart(2, '0');	/*padStart(2, '0') : 9분->09분*/
          const mm = String(now.getMinutes()).padStart(2, '0');
          const timeStr = `${hh}:${mm}`;
          
          const hint = document.getElementById('autosaveHint');
          if (hint) {
            hint.textContent = `임시저장됨 (${timeStr})`;
            hint.classList.add('saved');
          }
          
          alert(`임시저장 되었습니다. (${timeStr})`);

          fetchDraftList();	// 저장 후 즉시 목록 갱신
        } else if (restText === 'MISSING_GENRE') {
          alert('장르를 선택하지 않으면 임시저장을 할 수 없습니다. 관련 장르를 선택해주세요.');
        } else if (restText === 'MAX_LIMIT_EXCEEDED'){
          alert('임시저장은 최대 5개까지만 가능합니다.\n기존 임시저장 글을 삭제 후 다시 시도해주세요.')
        } else {
          alert('임시저장에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('Draft save error:', error);
        alert('서버 통신 중 오류가 발생했습니다.');
      });
    });
  }
});

// 1. 임시저장 목록 서버에서 조회해 오기
function fetchDraftList() {
  fetch('/review/draft/list')
    .then(response => {
      if (!response.ok) throw new Error('목록 조회 실패');
      return response.json();
    })
    .then(drafts => {
      renderDraftList(drafts);
    })
    .catch(error => {
      console.error('Draft list fetch error:', error);
    });
}

// 2. 화면에 임시저장 목록 UI 렌더링하기
function renderDraftList(drafts) {
  const listEl = document.getElementById('draftList');
  const emptyMsg = document.getElementById('draftEmptyMsg');

  if (!listEl) return;

  listEl.innerHTML = ''; // 기존 목록 초기화

  if (!drafts || drafts.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  drafts.forEach(draft => {
    const title = draft.reviewDraftTitle || '(제목 없음)';
    
    // 시간 포맷 처리 (예: "15:55")
    let timeStr = '';
    if (draft.reviewDraftSavedAt) {
      const dateObj = new Date(draft.reviewDraftSavedAt);
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');
      timeStr = `${hh}:${mm}`;
    }

    // 아이템 생성
    const item = document.createElement('div');
    item.className = 'draft-item';

    // 정보 영역 (제목 + 시간)
    const infoEl = document.createElement('div');
    infoEl.className = 'draft-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'draft-title';
    titleEl.textContent = title;

    const timeEl = document.createElement('div');
    timeEl.className = 'draft-time';
    timeEl.textContent = timeStr;

    infoEl.appendChild(titleEl);
    infoEl.appendChild(timeEl);

    // 버튼 영역 (불러오기 + 삭제)
    const actionsEl = document.createElement('div');
    actionsEl.className = 'draft-actions';

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'btn btn-sm btn-load';
    loadBtn.textContent = '불러오기';
    loadBtn.addEventListener('click', () => loadDraft(draft.reviewDraftId));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-sm btn-delete';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', () => deleteDraft(draft.reviewDraftId));

    actionsEl.appendChild(loadBtn);
    actionsEl.appendChild(deleteBtn);

    item.appendChild(infoEl);
    item.appendChild(actionsEl);

    listEl.appendChild(item);
  });
}

// 3. 불러오기 버튼 처리
function loadDraft(draftId) {
  fetch(`/review/draft/detail/${draftId}`)
    .then(response => {
      if (!response.ok) throw new Error('임시저장 조회 실패');
      return response.json();
    })
    .then(draft => {
      if (!draft) return;

      const titleInput = document.getElementById('review_title');
      const contentInput = document.getElementById('review_content');
	  const relatedInput = document.getElementById('review_related');

      // 1) 제목 & 내용 복구
      if (titleInput) titleInput.value = draft.reviewDraftTitle || '';
      if (contentInput) contentInput.value = draft.reviewDraftContent || '';
      if (relatedInput) relatedInput.value = draft.reviewDraftRelated || '';
	  

      // 2) 별점 복구
      if (draft.reviewRating !== undefined && ratingInput) {
        const score = parseFloat(draft.reviewRating || 0);
        ratingInput.value = score;
        updateStars(score);
      }

      // 3) 선택했던 장르 복구
      if (draft.genreCategoryIds && genreGrid) {
        const ids = draft.genreCategoryIds.map(id => String(id));
        genreGrid.querySelectorAll('.genre-chip').forEach(chip => {
          const gId = chip.getAttribute('data-genre-id');
          if (ids.includes(gId)) {
            chip.classList.add('selected');
          } else {
            chip.classList.remove('selected');
          }
        });

        if (genreDoneBtn) {
          genreDoneBtn.click();
        }
      }

      alert('임시저장된 내용을 불러왔습니다.');
    })
    .catch(error => {
      console.error('Draft load error:', error);
      alert('임시저장 불러오기에 실패했습니다.');
    });
}

// 4. 삭제 버튼 처리
function deleteDraft(draftId) {
  if (!confirm('이 임시저장 글을 삭제하시겠습니까?')) return;

  fetch(`/review/draft/delete/${draftId}`, {
    method: 'DELETE'
  })
    .then(response => {
      if (response.ok) {
        alert('삭제되었습니다.');
        fetchDraftList(); // 삭제 후 목록 즉시 재조회
      } else {
        alert('삭제에 실패했습니다.');
      }
    })
    .catch(error => {
      console.error('Draft delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    });
}

// ===== [5] 로컬 스토리지 기반 임시저장 기능 (주석 처리 유지) =====
/*function renderDraftList() {
  const drafts = getDrafts();
  const listEl = document.getElementById('draftList');
  const emptyMsg = document.getElementById('draftEmptyMsg');
  
  if (!listEl) return;
  
  listEl.innerHTML = '';
  if (drafts.length === 0) {
    if (emptyMsg) emptyMsg.style.display = '';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';
  
  drafts.slice().reverse().forEach((draft) => {
    const item = document.createElement('div');
    item.className = 'draft-item';

    const infoEl = document.createElement('div');
    infoEl.className = 'draft-info';
    const titleEl = document.createElement('div');
    titleEl.className = 'draft-title';
    titleEl.textContent = draft.title || '(제목 없음)';
    const timeEl = document.createElement('div');
    timeEl.className = 'draft-time';
    timeEl.textContent = draft.savedAt;
    infoEl.appendChild(titleEl);
    infoEl.appendChild(timeEl);

    const actionsEl = document.createElement('div');
    actionsEl.className = 'draft-actions';
    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'btn btn-sm';
    loadBtn.textContent = '불러오기';
    loadBtn.addEventListener('click', () => loadDraft(draft.id));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', () => deleteDraft(draft.id));
    
    actionsEl.appendChild(loadBtn);
    actionsEl.appendChild(deleteBtn);

    item.appendChild(infoEl);
    item.appendChild(actionsEl);
    listEl.appendChild(item);
  });
}

function loadDraft(id) {
  const draft = getDrafts().find((d) => d.id === id);
  if (!draft) return;
  
  if (document.getElementById('review_platform')) {
    document.getElementById('review_platform').value = draft.platform;
  }
  if (document.getElementById('review_title')) {
    document.getElementById('review_title').value = draft.title;
  }
  if (document.getElementById('review_content')) {
    document.getElementById('review_content').value = draft.body;
  }
  if (document.getElementById('review_related')) {
    document.getElementById('review_related').value = draft.related;
  }

  // 장르 복구 (다대다 데이터 복구 처리)
  if (draft.categories && genreGrid) {
    genreGrid.querySelectorAll('.genre-chip').forEach(chip => {
      const gId = chip.getAttribute('data-genre-id');
      if (draft.categories.includes(gId)) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });
    
    // 복구된 장르 목록을 기반으로 폼 내부 hidden input들 및 버튼 텍스트 강제 트리거링
    if (genreDoneBtn) {
      genreDoneBtn.click();
    }
  }

  alert('임시저장된 글을 불러왔습니다.');
}

function deleteDraft(id) {
  if (!confirm('이 임시저장 글을 삭제하시겠습니까?')) return;
  setDrafts(getDrafts().filter((d) => d.id !== id));
  renderDraftList();
}

const draftBtn = document.getElementById('draftBtn');
if (draftBtn) {
  draftBtn.addEventListener('click', () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    // 선택된 장르 목록 (다대다 복수형 ID 추출)
    const selectedIds = [];
    if (genreGrid) {
      genreGrid.querySelectorAll('.genre-chip.selected').forEach(chip => {
        selectedIds.push(chip.getAttribute('data-genre-id'));
      });
    }

    const drafts = getDrafts();
    drafts.push({
      id: Date.now(),
      title: document.getElementById('review_title').value.trim(),
      categories: selectedIds, // 다중 장르 저장
      platform: document.getElementById('review_platform').value,
      body: document.getElementById('review_content').value,
      related: document.getElementById('review_related').value,
      savedAt: timeStr,
    });
    setDrafts(drafts);
    renderDraftList();

    const hint = document.getElementById('autosaveHint');
    if (hint) {
      hint.textContent = `임시저장됨 (${timeStr})`;
      hint.classList.add('saved');
    }
  });
}*/

// 초기 로딩 목록 렌더링
/*renderDraftList();*/