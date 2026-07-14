function socialLogin(provider) {
  localStorage.setItem('demoRole', 'user');
  alert(provider + ' 계정으로 로그인되었습니다. (데모)');
  location.href = '01_main.html';
}
