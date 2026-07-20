// ---- 댓글 "신고" 클릭 시 댓글 바로 아래로 펼쳐지는 인라인 신고폼 (답글달기와 같은 방식) ----
function toggleReportForm(el) {
  const item = el.closest('.qna-comment-item');
  // 댓글 수정 폼도 스타일 재사용 때문에 .qna-report-form 클래스를 같이 갖고 있어서
  // (DOM상 더 앞에 있어) 제외하지 않으면 querySelector가 수정 폼을 먼저 집어버림
  const form = item && item.querySelector('.qna-report-form:not(.qna-comment-update-form)');
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
  const form = btn.closest('.qna-report-form');
  const item = btn.closest('.qna-comment-item');
  const qnaCommentId = item.dataset.commentId;
  const reason = form.querySelector('select').value;
  const content = form.querySelector('textarea').value.trim();
  if (!content) {
    alert('신고 사유를 구체적으로 입력해주세요.');
    return;
  }
  fetch(`/api/qna/comments/${qnaCommentId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qnaCommentReportReason: reason, qnaCommentReportContent: content })
  }).then(res => {
    if (res.ok) {
      alert('신고가 접수되었습니다. 운영자 확인 후 처리됩니다.');
      closeReportForm(btn);
    } else if (res.status === 401) {
      alert('로그인이 필요합니다.');
    } else {
      alert('신고 접수에 실패했습니다.');
    }
  });
}

// ---- 신고하기 모달 (질문 게시글 전용, 댓글은 인라인 신고폼 사용) ----
let reportTargetQnaId = null;
function openReportModal(qnaId) {
  reportTargetQnaId = qnaId;
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
  const content = document.getElementById('reportDetailInput').value.trim();
  if (!content) {
    alert('신고 사유를 구체적으로 입력해주세요.');
    return;
  }
  fetch(`/api/qna/${reportTargetQnaId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qnaReportReason: reason, qnaReportContent: content })
  }).then(res => {
    if (res.ok) {
      alert('신고가 접수되었습니다. 운영자 확인 후 처리됩니다.');
      closeReportModal();
    } else if (res.status === 401) {
      alert('로그인이 필요합니다.');
    } else {
      alert('신고 접수에 실패했습니다.');
    }
  });
}

// ---- 질문 삭제: confirm은 호출부(th:onclick)에서 이미 처리되어 여기선 바로 요청 ----
function deleteQna(qnaId) {
  fetch(`/api/qna/${qnaId}`, { method: 'DELETE' })
    .then(res => { if (res.ok) location.href = '/notice#qna'; else alert('삭제에 실패했습니다.'); });
}

// ---- 관리자 답변 삭제: confirm 후 DELETE 요청, 성공 시 페이지 새로고침 ----
function deleteAnswer(qnaId, adminAnswerId) {
  if (!confirm('답변을 삭제하시겠습니까?')) return;
  fetch(`/api/qna/${qnaId}/answer/${adminAnswerId}`, { method: 'DELETE' })
    .then(res => { if (res.ok) location.reload(); });
}

// ---- 댓글 삭제: confirm은 호출부(th:onclick)에서 이미 처리되어 여기선 바로 요청. memberId는 서버가 세션에서 확인 ----
function deleteComment(commentId) {
  fetch(`/api/qna/comments/${commentId}`, { method: 'DELETE' })
    .then(res => { if (res.ok) location.reload(); else alert('삭제에 실패했습니다.'); });
}

// ---- 댓글 수정 폼 토글: 본문은 숨기고 수정 폼(textarea)을 보여줌 ----
// .qna-comment-update-form은 qna-report-form 클래스를 같이 써서 display:flex 스타일을 재사용하므로 'flex'로 맞춤
function toggleCommentUpdateForm(btn) {
  const item = btn.closest('.qna-comment-item');
  const body = item.querySelector('.qna-comment-body');
  const form = item.querySelector('.qna-comment-update-form');
  const isUpdating = form.style.display !== 'none';
  form.style.display = isUpdating ? 'none' : 'flex';
  body.style.display = isUpdating ? 'block' : 'none';
}

// ---- 댓글 수정 취소: 입력값 초기화 없이 폼만 닫고 본문을 다시 보여줌 ----
function cancelUpdateComment(btn) {
  const item = btn.closest('.qna-comment-item');
  item.querySelector('.qna-comment-update-form').style.display = 'none';
  item.querySelector('.qna-comment-body').style.display = 'block';
}

// ---- 댓글 수정 저장: PUT 요청 후 성공 시 페이지 새로고침 ----
function saveUpdateComment(btn, commentId) {
  const item = btn.closest('.qna-comment-item');
  const content = item.querySelector('.qna-comment-update-input').value.trim();
  if (!content) { alert('댓글 내용을 입력해주세요.'); return; }
  fetch(`/api/qna/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qnaCommentContent: content })
  }).then(res => { if (res.ok) location.reload(); else alert('수정에 실패했습니다.'); });
}

// ---- 댓글 등록 버튼 이벤트 바인딩 ----
document.addEventListener('DOMContentLoaded', () => {
  const submitBtn = document.getElementById('commentSubmitBtn');
  if (!submitBtn) return;
  submitBtn.addEventListener('click', () => {
    const form = document.getElementById('qnaCommentForm');
    const qnaId = form.dataset.qnaId;
    const content = document.getElementById('qna_comment_content').value.trim();
    // 빈 내용 검증
    if (!content) { alert('댓글 내용을 입력해주세요.'); return; }
    // 댓글 등록 API 호출 (memberId는 서버에서 세션 기반으로 세팅되어야 함 - 현재 바디에는 포함 안 됨)
    fetch(`/api/qna/${qnaId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qnaCommentContent: content })
    }).then(res => { if (res.ok) location.reload(); });
  });
});
