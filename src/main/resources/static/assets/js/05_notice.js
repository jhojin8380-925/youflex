// 상단 공통 네비게이션 바를 현재 탭(공지사항/Q&A)에 맞게 강조
// (body의 data-nav-current는 "notice"로 고정돼 있어서 그대로 두면 항상 공지사항만 강조됨)
function syncTopNavActive(target) {
  document.querySelectorAll('.category-nav a[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === target);
  });
}

function applyNoticeHashState() {
  const isQna = location.hash === '#qna';
  const targetBtn = document.querySelector(
    `.notice-tabs button[data-tab-target="${isQna ? 'qna' : 'notice'}"]`
  );
  targetBtn && targetBtn.click();
  syncTopNavActive(isQna ? 'qna' : 'notice');
}

document.addEventListener('DOMContentLoaded', () => {
  applyNoticeHashState();

  // 페이지 안의 "공지사항"/"Q&A" 탭을 직접 눌렀을 때도 상단 네비게이션 강조를 같이 맞춰줌
  document.querySelectorAll('.notice-tabs button[data-tab-target]').forEach((btn) => {
    btn.addEventListener('click', () => syncTopNavActive(btn.dataset.tabTarget));
  });
});
// 05_notice.html 안에서 05_notice.html#qna 로 이동하는 것처럼 같은 문서 안 해시만 바뀌는 경우
// DOMContentLoaded가 다시 발생하지 않으므로 hashchange도 같이 들어야 함
window.addEventListener('hashchange', applyNoticeHashState);
