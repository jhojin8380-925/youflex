const commentInput = document.getElementById('qna_comment_content');
const commentCountLabel = document.getElementById('commentCountLabel');
const commentList = document.getElementById('commentList');
let commentCount = 3;

document.getElementById('commentSubmitBtn').addEventListener('click', () => {
  const val = commentInput.value.trim();
  if (!val) {
    alert('댓글 내용을 입력해주세요.');
    return;
  }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const item = document.createElement('div');
  item.className = 'qna-comment-item';
  item.innerHTML = `
    <div class="qna-comment-left">
      <div class="qna-comment-avatar"></div>
      <div>
        <span class="qna-comment-author">나</span><span class="qna-comment-date">${dateStr}</span>
        <div class="qna-comment-body"></div>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button class="btn btn-sm btn-ghost" onclick="toggleReportForm(this)">신고</button>
      <span class="qna-comment-more">⋮</span>
    </div>
    <div class="qna-report-form" style="display:none">
      <label class="text-muted" style="font-size:12px">신고 사유</label>
      <select>
        <option>스팸 / 도배</option>
        <option>욕설 / 비방</option>
        <option>음란물</option>
        <option>저작권 침해</option>
        <option>기타</option>
      </select>
      <textarea placeholder="신고 사유를 구체적으로 입력해주세요"></textarea>
      <div class="btn-row" style="margin-top:0">
        <button type="button" class="btn btn-sm" onclick="closeReportForm(this)">취소</button>
        <button type="button" class="btn btn-sm btn-primary" onclick="submitReportForm(this)">신고하기</button>
      </div>
    </div>
  `;
  item.querySelector('.qna-comment-body').textContent = val;
  commentList.appendChild(item);

  commentCount += 1;
  commentCountLabel.textContent = `댓글 (${commentCount})`;

  commentInput.value = '';
});

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
  alert('신고가 접수되었습니다. 운영자 확인 후 처리됩니다.');
  closeReportForm(btn);
}

// ---- 신고하기 모달 (질문 게시글 전용, 댓글은 인라인 신고폼 사용) ----
function openReportModal() {
  document.getElementById('reportTargetChip').textContent = '신고 대상: 질문';
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


