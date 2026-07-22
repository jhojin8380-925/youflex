// 프로필 이미지 업로드 미리보기
const profileImageTrigger = document.getElementById('profileImageTrigger');
const profileFileInput = document.getElementById('member_profile_img');
const profilePreview = document.getElementById('profilePreview');

profileImageTrigger.addEventListener('click', () => profileFileInput.click());
profileFileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드할 수 있습니다.');
    profileFileInput.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    profilePreview.src = e.target.result;
    profilePreview.style.display = 'block';
    document.getElementById('avatarPlus').style.display = 'none';
  };
  reader.readAsDataURL(file);
});

// 등업신청 - 클릭하면 실제로 서버에 신청 상태를 남겨서 관리자 등업신청 관리 화면에 노출시킴
// (게시글 3회 / 유효경고 0회 / 좋아요 총합 100회 조건 미달이면 서버가 400과 함께 구체적인 사유를 내려줌)
document.getElementById('rankUpBtn').addEventListener('click', () => {
  fetch('/mypage/grade-upgrade', { method: 'POST' })
    .then((res) => {
      if (res.ok) {
        alert('등업 신청이 접수되었습니다. 관리자 확인 후 등급이 변경됩니다.');
        return;
      }
      return res.text().then((message) => {
        alert(message || '등업 신청 중 오류가 발생했습니다.');
      });
    })
    .catch(() => {
      alert('등업 신청 중 오류가 발생했습니다.');
    });
});

// 취향(관심 장르) 선택 - 서버가 th:classappend로 미리 체크해둔 상태(selected)를 기준으로
// 최대 3개까지 토글하고, "완료" 클릭 시 실제 선택 상태로 DB를 교체 저장(join.js의 방식과 동일)
const genreGrid = document.getElementById('genreGrid');
const MAX_GENRE_SELECT = 3;

// 지금 화면에 체크(selected) 표시되어 있는 칩들의 data-genre-id 목록을 뽑아냄
function getSelectedGenreIds() {
  return Array.from(genreGrid.querySelectorAll('.genre-chip.selected')).map((chip) => chip.dataset.genreId);
}

// 취소(나중에 설정하기) 시 되돌릴 수 있도록 마지막으로 저장 완료된 상태를 기억해둠
let confirmedGenreIds = getSelectedGenreIds();

// 주어진 id 목록에 맞춰 칩들의 selected 클래스를 다시 그려줌(모달을 다시 열 때 사용)
function applyGenreSelection(ids) {
  genreGrid.querySelectorAll('.genre-chip').forEach((chip) => {
    chip.classList.toggle('selected', ids.includes(chip.dataset.genreId));
  });
}

// "❤️ 장르 선택" 버튼 - 모달을 열 때마다 마지막으로 저장된 상태로 칩 선택을 리셋한 뒤 보여줌
document.getElementById('tasteBtn').addEventListener('click', () => {
  applyGenreSelection(confirmedGenreIds);
  document.getElementById('genreModalBackdrop').classList.add('open');
});

// 장르 칩 클릭 시 선택/해제 토글. 이미 3개를 골랐는데 새로 선택하려 하면 막고 안내만 띄움
genreGrid.querySelectorAll('.genre-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const selectedCount = genreGrid.querySelectorAll('.genre-chip.selected').length;
    if (!chip.classList.contains('selected') && selectedCount >= MAX_GENRE_SELECT) {
      alert(`관심 장르는 최대 ${MAX_GENRE_SELECT}개까지 선택할 수 있어요.`);
      return;
    }
    chip.classList.toggle('selected');
  });
});

// "나중에 설정하기" - 서버에 아무것도 보내지 않고 모달만 닫음(선택 내용은 다음에 열 때 버려짐)
document.getElementById('genreSkipBtn').addEventListener('click', () => {
  document.getElementById('genreModalBackdrop').classList.remove('open');
});

// "완료" - 현재 선택된 장르 id들을 폼 형식으로 묶어 /mypage/genres에 저장(기존 선택은 서버에서 통째로 교체됨)
document.getElementById('genreDoneBtn').addEventListener('click', () => {
  const selectedIds = getSelectedGenreIds();
  const body = selectedIds.map((id) => 'genreCategoryIds=' + encodeURIComponent(id)).join('&');
  fetch('/mypage/genres', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
    .then((res) => {
      if (!res.ok) throw new Error('genre update failed');
      // 저장 성공 시에만 "확정 상태"를 갱신 - 실패하면 다음에 모달 열었을 때 원래 상태로 되돌아가야 하므로
      confirmedGenreIds = selectedIds;
      document.getElementById('genreModalBackdrop').classList.remove('open');
      alert('취향이 저장되었습니다.');
    })
    .catch(() => {
      alert('취향 저장 중 오류가 발생했습니다.');
    });
});
// 새 비밀번호 일치 확인
const newPasswordInput = document.getElementById('member_pwd');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const matchMessage = document.getElementById('passwordMatchMessage');

function checkPasswordMatch() {
  if (!newPasswordInput.value || !confirmNewPasswordInput.value) {
    matchMessage.textContent = '';
    return;
  }
  if (newPasswordInput.value === confirmNewPasswordInput.value) {
    matchMessage.textContent = '✓ 새 비밀번호가 일치합니다.';
    matchMessage.style.color = 'var(--success)';
  } else {
    matchMessage.textContent = '✗ 새 비밀번호가 일치하지 않습니다.';
    matchMessage.style.color = 'var(--danger)';
  }
}
newPasswordInput.addEventListener('input', checkPasswordMatch);
confirmNewPasswordInput.addEventListener('input', checkPasswordMatch);

document.getElementById('saveProfileBtn').addEventListener('click', () => {
  if (!document.getElementById('currentPassword').value.trim()) {
    alert('현재 비밀번호를 입력해주세요.');
    return;
  }
  if (newPasswordInput.value && newPasswordInput.value !== confirmNewPasswordInput.value) {
    alert('새 비밀번호가 일치하지 않아 저장할 수 없습니다.');
    return;
  }
  // 클라이언트 검증 통과 시 실제로 /mypage에 POST 제출(서버에서 현재 비밀번호 재검증)
  document.getElementById('profileForm').submit();
});

// 회원탈퇴 2차 확인 - 확인 통과 시 실제로 /mypage/withdraw에 신청을 보냄(관리자 최종 승인/반려 전까지는 탈퇴신청 상태)
document.getElementById('withdrawBtn').addEventListener('click', (e) => {
  e.preventDefault();
  if (!confirm('정말 YouFlex 서비스를 탈퇴하시겠습니까?\n탈퇴 시 회원 정보 및 모든 포인트 데이터가 영구 삭제됩니다.')) return;
  if (!confirm('삭제된 계정 정보는 복구할 수 없습니다.\n그래도 탈퇴를 진행하시겠습니까?')) return;
  fetch('/mypage/withdraw', { method: 'POST' })
    .then((res) => {
      if (!res.ok) throw new Error('withdraw request failed');
      alert('탈퇴신청이 되었습니다.');
      location.href = '/login';
    })
    .catch(() => {
      alert('탈퇴 신청 중 오류가 발생했습니다.');
    });
});

// ===================== 내 글 탭 =====================
// 정적 목업 대신 /mypage/reviews를 fetch해서 5개씩 페이징으로 채움
const myPostsList = document.getElementById('myPostsList');
const myPostsPagination = document.getElementById('myPostsPagination');

// 게시글 한 건을 post-row 구조(썸네일 + 제목/장르·별점 + 날짜/조회수)로 그려줌
function renderMyPostRow(review) {
  const row = document.createElement('div');
  row.className = 'post-row';
  // 클릭하면 해당 게시글 상세 페이지로 이동
  row.addEventListener('click', () => {
    location.href = '/review/' + review.reviewId;
  });

  const thumb = document.createElement('div');
  thumb.className = 'post-row-thumb';
  if (review.reviewImg) {
    const img = document.createElement('img');
    img.src = '/upload/' + review.reviewImg;
    img.className = 'post-img';
    thumb.appendChild(img);
  }
  row.appendChild(thumb);

  const body = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'post-row-title';
  title.textContent = review.reviewTitle;
  const sub = document.createElement('div');
  sub.className = 'post-row-sub';
  // 장르(review_mapping 다대다라 서버에서 콤마로 이미 묶어서 내려줌)와 별점을 있는 것만 이어붙임
  const subParts = [];
  if (review.genreCategoryName) subParts.push(review.genreCategoryName);
  if (review.reviewRating != null) subParts.push('★ ' + review.reviewRating);
  sub.textContent = subParts.join(' · ');
  body.appendChild(title);
  body.appendChild(sub);
  row.appendChild(body);

  const right = document.createElement('div');
  right.className = 'post-row-right';
  right.textContent = (review.reviewCreatedAt || '').slice(0, 10);
  right.appendChild(document.createElement('br'));
  right.appendChild(document.createTextNode('조회 ' + (review.reviewHit ?? 0)));
  row.appendChild(right);

  return row;
}

// 페이지 버튼(이전/숫자/다음) 공통 렌더러. 내 글/북마크/포인트 내역 탭이 모두 공유해서 쓴다.
// 페이지가 1개뿐이어도 항상 보여주고, 버튼 클릭 시 onPageClick(page)로 페이지 이동을 위임한다.
function renderPagination(container, totalPages, currentPage, onPageClick) {
  container.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn prev';
  prevBtn.setAttribute('aria-label', '이전 페이지');
  prevBtn.textContent = '‹';
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener('click', () => onPageClick(currentPage - 1));
  container.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => onPageClick(i));
    container.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn next';
  nextBtn.setAttribute('aria-label', '다음 페이지');
  nextBtn.textContent = '›';
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener('click', () => onPageClick(currentPage + 1));
  container.appendChild(nextBtn);
}

function renderMyPostsPagination(totalPages, currentPage) {
  renderPagination(myPostsPagination, totalPages, currentPage, loadMyPosts);
}

function loadMyPosts(page) {
  fetch(`/mypage/reviews?page=${page}`)
    .then((res) => {
      if (!res.ok) throw new Error('my posts request failed');
      return res.json();
    })
    .then((data) => {
      myPostsList.innerHTML = '';
      if (!data.reviews.length) {
        myPostsList.innerHTML = '<div class="text-muted" style="text-align:center;padding:24px 0">아직 작성한 글이 없습니다.</div>';
      } else {
        data.reviews.forEach((review) => myPostsList.appendChild(renderMyPostRow(review)));
      }
      renderMyPostsPagination(data.totalPages, data.page);
    })
    .catch(() => {
      myPostsList.innerHTML = '<div class="text-muted" style="text-align:center;padding:24px 0">내 글을 불러오지 못했습니다.</div>';
    });
}

if (myPostsList) {
  loadMyPosts(1);
}

// ===================== 북마크 탭 =====================
// 정적 목업 대신 /mypage/bookmarks를 fetch해서 5개씩 페이징으로 채움("내 글" 탭과 같은 post-row 구조 재사용)
const myBookmarksList = document.getElementById('myBookmarksList');
const myBookmarksPagination = document.getElementById('myBookmarksPagination');

// 북마크 한 건을 post-row 구조(썸네일 + 제목/작성자 + 날짜)로 그려줌
function renderBookmarkRow(bookmark) {
  const row = document.createElement('div');
  row.className = 'post-row';
  // 클릭하면 해당 게시글 상세 페이지로 이동
  row.addEventListener('click', () => {
    location.href = '/review/' + bookmark.reviewId;
  });

  const thumb = document.createElement('div');
  thumb.className = 'post-row-thumb';
  if (bookmark.reviewImg) {
    const img = document.createElement('img');
    img.src = '/upload/' + bookmark.reviewImg;
    img.className = 'post-img';
    thumb.appendChild(img);
  }
  row.appendChild(thumb);

  const body = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'post-row-title';
  title.textContent = bookmark.reviewTitle;
  const sub = document.createElement('div');
  sub.className = 'post-row-sub';
  sub.textContent = bookmark.memberName || '';
  body.appendChild(title);
  body.appendChild(sub);
  row.appendChild(body);

  const right = document.createElement('div');
  right.className = 'post-row-right';
  right.textContent = (bookmark.bookmarkCreatedAt || '').slice(0, 10);
  row.appendChild(right);

  return row;
}

function loadMyBookmarks(page) {
  fetch(`/mypage/bookmarks?page=${page}`)
    .then((res) => {
      if (!res.ok) throw new Error('my bookmarks request failed');
      return res.json();
    })
    .then((data) => {
      myBookmarksList.innerHTML = '';
      if (!data.bookmarks.length) {
        myBookmarksList.innerHTML = '<div class="text-muted" style="text-align:center;padding:24px 0">북마크한 글이 없습니다.</div>';
      } else {
        data.bookmarks.forEach((bookmark) => myBookmarksList.appendChild(renderBookmarkRow(bookmark)));
      }
      renderPagination(myBookmarksPagination, data.totalPages, data.page, loadMyBookmarks);
    })
    .catch(() => {
      myBookmarksList.innerHTML = '<div class="text-muted" style="text-align:center;padding:24px 0">북마크 목록을 불러오지 못했습니다.</div>';
    });
}

if (myBookmarksList) {
  loadMyBookmarks(1);
}

// ===================== 포인트 내역 탭 =====================
// 정적 목업 대신 /mypage/points를 fetch해서 10개씩 페이징으로 채움
const myPointsBody = document.getElementById('myPointsBody');
const myPointsPagination = document.getElementById('myPointsPagination');

// 포인트 내역 한 건을 표의 한 행(일자/내역/포인트/잔액)으로 그려줌
function renderPointRow(history) {
  const tr = document.createElement('tr');

  const dateTd = document.createElement('td');
  dateTd.textContent = (history.pointHistoryCreatedAt || '').slice(0, 10);
  tr.appendChild(dateTd);

  const reasonTd = document.createElement('td');
  reasonTd.textContent = history.pointHistoryReason;
  tr.appendChild(reasonTd);

  // 서버가 '적립'/'사용'/'만료' 타입으로 내려주므로 여기서 부호만 붙여서 표시
  const signed = history.pointHistoryType === '적립' ? history.pointHistoryAmount : -history.pointHistoryAmount;
  const amountTd = document.createElement('td');
  amountTd.textContent = (signed > 0 ? '+' : '') + signed + ' P';
  amountTd.style.color = signed > 0 ? 'var(--success)' : signed < 0 ? 'var(--danger)' : 'var(--text-2)';
  tr.appendChild(amountTd);

  const balanceTd = document.createElement('td');
  balanceTd.textContent = history.pointHistoryBalance + ' P';
  tr.appendChild(balanceTd);

  return tr;
}

function loadMyPoints(page) {
  fetch(`/mypage/points?page=${page}`)
    .then((res) => {
      if (!res.ok) throw new Error('my points request failed');
      return res.json();
    })
    .then((data) => {
      myPointsBody.innerHTML = '';
      if (!data.history.length) {
        myPointsBody.innerHTML = '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:24px 0">포인트 내역이 없습니다.</td></tr>';
      } else {
        data.history.forEach((h) => myPointsBody.appendChild(renderPointRow(h)));
      }
      renderPagination(myPointsPagination, data.totalPages, data.page, loadMyPoints);
    })
    .catch(() => {
      myPointsBody.innerHTML = '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:24px 0">포인트 내역을 불러오지 못했습니다.</td></tr>';
    });
}

if (myPointsBody) {
  loadMyPoints(1);
}