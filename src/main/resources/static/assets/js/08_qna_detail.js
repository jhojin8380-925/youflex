// ---- 댓글 "신고" 클릭 시 댓글 바로 아래로 펼쳐지는 인라인 신고폼 (답글달기와 같은 방식) ----
function toggleReportForm(el) {
  const item = el.closest('.qna-comment-item');
  const form = item && item.querySelector('.qna-report-form');
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}
function closeReportForm(btn) {
  const form = btn.closest('.qna-report-form');
  if (!form) return;
  form.querySelector('select').selectedIndex = 0;
  form.querySelector('textarea').value = '';
  form.style.display = 'none';
}
function submitReportForm(btn) {
  // TODO: 댓글 신고 API(/api/qna/comments/{id}/report) 연결 필요
  alert('신고가 접수되었습니다. 운영자 확인 후 처리됩니다.');
  closeReportForm(btn);
}

// ---- 신고하기 모달 (질문 게시글 전용, 댓글은 인라인 신고폼 사용) ----
let currentReportQnaId = null;

function openReportModal(qnaId) {
  currentReportQnaId = qnaId;
  document.getElementById('reportTargetChip').textContent = '신고 대상: 질문';
  document.getElementById('reportReasonSelect').selectedIndex = 0;
  document.getElementById('reportDetailInput').value = '';
  document.getElementById('reportModalBackdrop').classList.add('open');
}
function closeReportModal() {
  document.getElementById('reportModalBackdrop').classList.remove('open');
}
function submitReportModal() {
  const reason = document.getElementById('reportReasonSelect').value;
  const detail = document.getElementById('reportDetailInput').value.trim();

  fetch(`/api/qna/${currentReportQnaId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qnaReportReason: reason, qnaReportContent: detail })
  })
    .then((res) => {
      if (res.ok) {
        alert('신고가 접수되었습니다. 운영자 확인 후 처리됩니다.');
      } else {
        alert('신고 접수에 실패했습니다.');
      }
      closeReportModal();
    })
    .catch(() => {
      alert('신고 접수 중 오류가 발생했습니다.');
      closeReportModal();
    });
}
