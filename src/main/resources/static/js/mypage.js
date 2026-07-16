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

// 등업신청
document.getElementById('rankUpBtn').addEventListener('click', () => {
  alert('등업 신청이 접수되었습니다. 관리자 확인 후 등급이 변경됩니다. (데모)');
});

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

// 회원탈퇴 2차 확인
document.getElementById('withdrawBtn').addEventListener('click', (e) => {
  e.preventDefault();
  if (!confirm('정말 YouFlex 서비스를 탈퇴하시겠습니까?\n탈퇴 시 회원 정보 및 모든 포인트 데이터가 영구 삭제됩니다.')) return;
  if (!confirm('삭제된 계정 정보는 복구할 수 없습니다.\n그래도 탈퇴를 진행하시겠습니까?')) return;
  alert('회원탈퇴가 정상적으로 처리되었습니다. 그동안 이용해 주셔서 감사합니다.');
  location.href = '02_login.html';
});