const idInput = document.getElementById('member_loginid');
const idStatus = document.getElementById('idStatus');
document.getElementById('idCheckBtn').addEventListener('click', () => {
  const loginId = idInput.value.trim();
  if (!loginId) {
    idStatus.textContent = '아이디를 입력해주세요.';
    idStatus.className = 'id-status no';
    return;
  }
  // 데모용 하드코딩 대신 MemberController의 /join/check-id를 호출해 실제 DB 기준으로 확인
  fetch('/join/check-id?loginId=' + encodeURIComponent(loginId))
    .then((res) => res.json())
    .then((data) => {
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

const pwInput = document.getElementById('member_pwd');
const pwConfirmInput = document.getElementById('pwConfirmInput');
const pwMatch = document.getElementById('pwMatch');

function setRule(id, ok) {
  const li = document.getElementById(id);
  li.classList.toggle('ok', ok);
  li.querySelector('.mark').textContent = ok ? '✓' : '○';
}

pwInput.addEventListener('input', () => {
  const v = pwInput.value;
  setRule('rule-len', v.length >= 8);
  setRule('rule-letter', /[A-Za-z]/.test(v));
  setRule('rule-digit', /[0-9]/.test(v));
  setRule('rule-special', /[^A-Za-z0-9]/.test(v));
  checkMatch();
});

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

function openGenreModal() {
  document.getElementById('genreModalBackdrop').classList.add('open');
}

// 장르 선택 모달의 "완료"/"나중에 설정하기" 클릭 시 실제 회원가입 폼(/join)을 제출.
// 장르 선택값 자체는 아직 서버로 저장하지 않음(관심 장르 저장 기능은 별도 구현 필요).
function finishSignup() {
  document.getElementById('signupForm').submit();
}

document.getElementById('genreDoneBtn').addEventListener('click', finishSignup);
document.getElementById('genreSkipBtn').addEventListener('click', finishSignup);
