document.getElementById('adminAnswerSaveBtn').addEventListener('click', () => {
  const content = document.getElementById('admin_answer_content').value.trim();
  if (!content) {
    alert('답변 내용을 입력해주세요.');
    return;
  }

  const qnaId = document.getElementById('adminAnswerForm').dataset.qnaId;

  fetch(`/api/qna/${qnaId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content })
  }).then(res => {
    if (res.ok) {
      location.href = '/admin?tab=qna';
    } else if (res.status === 403) {
      alert('관리자만 답변할 수 있습니다.');
    } else {
      alert('저장에 실패했습니다.');
    }
  });
});
