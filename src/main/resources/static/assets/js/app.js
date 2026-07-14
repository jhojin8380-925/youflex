/*
 * app.js - 공통 스크립트 자리표시자
 * ------------------------------------------------------------
 * 원본 app.js 전체 내용을 받지 못해서, 지금까지 대화에서 확인된
 * 공통 UI 동작(알림/챗봇/채팅 패널 열고 닫기, 맨 위로 버튼)만
 * 최소한으로 구현해둔 상태입니다.
 *
 * 실제 프로젝트에 있는 원본 app.js로 반드시 교체해주세요.
 * 이 파일은 화면이 깨지지 않고 확인 가능하도록 만든 임시본입니다.
 * ------------------------------------------------------------
 */

function bindPanel(triggerId, backdropId, panelId, closeId) {
  const trigger = document.getElementById(triggerId);
  const backdrop = document.getElementById(backdropId);
  const panel = document.getElementById(panelId);
  const closeBtn = document.getElementById(closeId);
  if (!trigger || !backdrop || !panel) return;

  const open = () => {
    backdrop.classList.add('open');
    panel.classList.add('open');
  };
  const close = () => {
    backdrop.classList.remove('open');
    panel.classList.remove('open');
  };

  trigger.addEventListener('click', open);
  backdrop.addEventListener('click', close);
  closeBtn && closeBtn.addEventListener('click', close);
}

document.addEventListener('DOMContentLoaded', () => {
  bindPanel('notificationTrigger', 'notificationBackdrop', 'notificationPanel', 'notificationClose');
  bindPanel('chatbotFab', 'chatbotBackdrop', 'chatbotPanel', 'chatbotClose');
  bindPanel('chatroomTrigger', 'chatroomBackdrop', 'chatroomPanel', 'chatroomClose');

  // 패널/모달 내부 탭 전환 (data-tab-panels 구조 공통 처리)
  document.querySelectorAll('[data-tab-panels]').forEach((tabGroup) => {
    const buttons = tabGroup.querySelectorAll('button[data-tab-target]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const parent = tabGroup.parentElement;
        parent.querySelectorAll('[data-tab-panel]').forEach((panel) => {
          panel.style.display = panel.dataset.tabPanel === btn.dataset.tabTarget ? '' : 'none';
        });
      });
    });
  });

  // 맨 위로 버튼
  const topBtn = document.getElementById('footerTopBtn');
  if (topBtn) {
    topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // TODO: 알림/채팅 뱃지 카운트는 로그인 붙인 뒤 아래 API로 채우기
  // fetch('/api/notifications/count').then(...)
});
