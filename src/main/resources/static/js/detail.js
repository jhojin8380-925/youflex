
function openReportModal(targetType) {
  const type = targetType === 'comment' ? '댓글' : '게시글';
  document.getElementById('reportTargetChip').textContent = `신고 대상: ${type}`;
  document.getElementById('reportReasonSelect').selectedIndex = 0;
  document.getElementById('reportDetailInput').value = '';
  document.getElementById('reportModalBackdrop').classList.add('open');
}
function closeReportModal() {
  document.getElementById('reportModalBackdrop').classList.remove('open');
}
function submitReportModal() {
  alert('신고가 접수되었습니다. 운영자 확인 후 처리됩니다.');
  closeReportModal();
}

function toggleCommentLike(el) {
  const liked = el.classList.toggle('liked');
  const count = parseInt(el.dataset.count, 10) + (liked ? 1 : -1);
  el.dataset.count = count;
  el.textContent = `♥ 좋아요 ${count}`;
}

// ---- 전체 댓글/대댓글: "답글달기" 클릭 시 바로 아래에 답글 작성폼 열기/닫기 ----
// (대댓글의 "답글달기"는 그 대댓글 자신의 작성폼만 열어야 하므로, 가장 가까운
//  댓글/대댓글 단위를 찾은 뒤 그 "바로 아래" 자식 폼만 선택)
function toggleReplyForm(el) {
  const unit = el.closest('.comment-item, .reply-item');
  if (!unit) return;
  const form = unit.querySelector(':scope > .reply-form');
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'flex' : 'none';
  if (form.style.display === 'flex') form.querySelector('input').focus();
}

// ---- 답글 작성폼의 "등록" 클릭 시 폼 닫기 ----
function submitReplyForm(btn) {
  const form = btn.closest('.reply-form');
  if (!form) return;
  form.querySelector('input').value = '';
  form.style.display = 'none';
}

// ---- 댓글/대댓글 "삭제" 클릭 시 확인 후 제거 ----
function deleteComment(el) {
  const unit = el.closest('.comment-item, .reply-item');
  if (!unit) return;
  if (!confirm('댓글을 삭제하시겠습니까?')) return;
  unit.remove();
}

// ---- 댓글/대댓글 "수정" 클릭 시 본문을 입력창으로 바꿔서 바로 수정 ----
function editComment(el) {
  const unit = el.closest('.comment-item, .reply-item');
  if (!unit) return;
  const body = unit.querySelector(':scope > .c-body');
  if (!body || unit.querySelector(':scope > .comment-edit-form')) return;

  const form = document.createElement('div');
  form.className = 'comment-edit-form';
  form.innerHTML =
    '<input type="text" /><button type="button" class="btn btn-primary btn-sm">저장</button>';
  const input = form.querySelector('input');
  input.value = body.textContent.trim();

  form.querySelector('button').addEventListener('click', () => {
    body.textContent = input.value.trim() || body.textContent;
    body.style.display = '';
    form.remove();
  });

  body.style.display = 'none';
  body.after(form);
  input.focus();
}

