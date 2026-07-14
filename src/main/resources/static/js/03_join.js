const idInput = document.getElementById('member_loginid');
const idStatus = document.getElementById('idStatus');
document.getElementById('idCheckBtn').addEventListener('click', () => {
  if (!idInput.value.trim()) {
    idStatus.textContent = '아이디를 입력해주세요.';
    idStatus.className = 'id-status no';
    return;
  }
  // 데모: 'admin'만 중복으로 가정
  if (idInput.value.trim().toLowerCase() === 'admin') {
    idStatus.textContent = '이미 사용 중인 아이디입니다.';
    idStatus.className = 'id-status no';
  } else {
    idStatus.textContent = '사용 가능한 아이디입니다.';
    idStatus.className = 'id-status ok';
  }
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

function finishSignup() {
  localStorage.setItem('demoRole', 'user');
  alert('회원가입이 완료되었습니다.');
  location.href = '02_login.html';
}

document.getElementById('genreDoneBtn').addEventListener('click', finishSignup);
document.getElementById('genreSkipBtn').addEventListener('click', finishSignup);
