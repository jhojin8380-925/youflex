const idInput = document.getElementById('member_loginid');
const idStatus = document.getElementById('idStatus');
document.getElementById('idCheckBtn').addEventListener('click', () => {
  const loginId = idInput.value.trim();  // idInput 값을 loginId 에 담음
  if (!loginId) { // loginId가 존재하지 않으면 발동
    // 중복확인 전용 아이디 값을 입력 했는지
    idStatus.textContent = '아이디를 입력해주세요.';
    idStatus.className = 'id-status no';
    return;
  }
  // 데모용 하드코딩 대신 MemberController의 /join/check-id를 호출해 실제 DB 기준으로 확인
  fetch('/join/check-id?loginId=' + encodeURIComponent(loginId))
    .then((res) => {
      // res.ok를 확인하지 않으면 서버 에러(500 등)까지 "이미 사용 중"으로 잘못 표시됨
      // (data.available이 undefined라 falsy로 취급되던 버그)
      if (!res.ok) throw new Error('check-id request failed'); 
      return res.json();
    })
    // data : 콜백의 매개변수 이름, res.json()이 파싱한 { available: true/false } 객체
    .then((data) => {
      // available 값에 따라 성공/중복 메시지 표시
      if (data.available) {
        idStatus.textContent = '사용 가능한 아이디입니다.';
        idStatus.className = 'id-status ok';
      } else {
        idStatus.textContent = '이미 사용 중인 아이디입니다.';
        idStatus.className = 'id-status no';
      }
    })
    .catch(() => {
      idStatus.textContent = '중복확인 중 오류가 발생했습니다.';
      idStatus.className = 'id-status no';
    });
});

const emailInput = document.getElementById('member_email');
const emailStatus = document.getElementById('emailStatus');
document.getElementById('emailCheckBtn').addEventListener('click', () => {
  const email = emailInput.value.trim();
  if (!email) {
    emailStatus.textContent = '이메일을 입력해주세요.';
    emailStatus.className = 'id-status no';
    return;
  }
  // 데모용 하드코딩 대신 MemberController의 /join/check-email를 호출해 실제 DB 기준으로 확인
  fetch('/join/check-email?email=' + encodeURIComponent(email))
    .then((res) => {
      if (!res.ok) throw new Error('check-email request failed');
      return res.json();
    })
    .then((data) => {
      if (data.available) {
        emailStatus.textContent = '사용 가능한 이메일입니다.';
        emailStatus.className = 'id-status ok';
      } else {
        emailStatus.textContent = '이미 사용 중인 이메일입니다.';
        emailStatus.className = 'id-status no';
      }
    })
    .catch(() => {
      emailStatus.textContent = '중복확인 중 오류가 발생했습니다.';
      emailStatus.className = 'id-status no';
    });
});

const pwInput = document.getElementById('member_pwd');
const pwConfirmInput = document.getElementById('pwConfirmInput');
const pwMatch = document.getElementById('pwMatch');
const MIN_PW_LENGTH = 4;

// 비밀번호 규칙 체크리스트 항목 하나의 표시(✓/○, ok 클래스)를 갱신
function setRule(id, ok) {
  const li = document.getElementById(id);
  li.classList.toggle('ok', ok);
  li.querySelector('.mark').textContent = ok ? '✓' : '○';
}

// 비밀번호 입력 중 실시간으로 길이 규칙 체크 + 비밀번호 확인란과 일치 여부 갱신
pwInput.addEventListener('input', () => {
  setRule('rule-len', pwInput.value.length >= MIN_PW_LENGTH);
  checkMatch();
});

// 비밀번호와 비밀번호 확인 입력값이 일치하는지 실시간으로 안내
function checkMatch() {
  if (!pwConfirmInput.value) { pwMatch.textContent = ''; return; }
  if (pwInput.value === pwConfirmInput.value) {
    pwMatch.textContent = '비밀번호가 일치합니다.';
    pwMatch.className = 'pw-match ok';
  } else {
    pwMatch.textContent = '비밀번호가 일치하지 않습니다.';
    pwMatch.className = 'pw-match no';
  }
}
pwConfirmInput.addEventListener('input', checkMatch);

// 취향(장르) 선택 모달을 화면에 표시
function openGenreModal() {
  document.getElementById('genreModalBackdrop').classList.add('open');
}

// 실시간 체크리스트는 눈으로 보여주기만 할 뿐 제출을 막지는 않았던 문제 수정:
// 폼 제출 시점에 실제로 규칙을 검사해서, 통과 못 하면 취향 선택 모달로 못 넘어가게 막음.
document.getElementById('signupForm').addEventListener('submit', (e) => {
  e.preventDefault();

  if (pwInput.value.length < MIN_PW_LENGTH) {
    pwMatch.textContent = `비밀번호는 ${MIN_PW_LENGTH}자 이상이어야 합니다.`;
    pwMatch.className = 'pw-match no';
    pwInput.focus();
    return;
  }
  if (pwInput.value !== pwConfirmInput.value) {
    pwMatch.textContent = '비밀번호가 일치하지 않습니다.';
    pwMatch.className = 'pw-match no';
    pwConfirmInput.focus();
    return;
  }

  openGenreModal();
});

// ---- 취향 선택 모달: 최대 3개까지만 선택 가능 (app.js의 공용 genre-chip 핸들러는
//      #genreGrid를 건너뛰므로 여기서만 처리) ----
const MAX_GENRE_SELECT = 3;
const genreGrid = document.getElementById('genreGrid');
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

// 장르 선택 모달의 "완료"/"나중에 설정하기" 클릭 시 선택된 장르 id를 hidden input으로 담아
// 실제 회원가입 폼(/join)을 제출. 선택을 안 했으면(스킵) 장르 없이 그대로 제출됨.
function finishSignup() {
  const form = document.getElementById('signupForm');
  genreGrid.querySelectorAll('.genre-chip.selected').forEach((chip) => {
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'genreCategoryIds';
    hidden.value = chip.dataset.genreId;
    form.appendChild(hidden);
  });
  form.submit();
}

document.getElementById('genreDoneBtn').addEventListener('click', finishSignup);
document.getElementById('genreSkipBtn').addEventListener('click', finishSignup);
