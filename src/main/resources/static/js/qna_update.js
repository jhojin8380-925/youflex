document.getElementById('qnaSaveBtn').addEventListener('click', () => {
  const title = document.getElementById('qna_title').value.trim();
  const content = document.getElementById('qna_content').value.trim();
  if (!title) {
    alert('제목을 입력해주세요.');
    return;
  }
  if (!content) {
    alert('내용을 입력해주세요.');
    return;
  }

  const qnaId = document.getElementById('qnaUpdateForm').dataset.qnaId;
  const qnaIsSecret = document.querySelector('input[name="qna_is_secret"]:checked').value; // 'N' 또는 'Y', 서버에서 '공개'/'비밀'로 변환됨

  fetch(`/api/qna/${qnaId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qnaTitle: title, qnaContent: content, qnaIsSecret: qnaIsSecret })
  }).then(res => {
    if (res.ok) {
      location.href = `/qna/${qnaId}`;
    } else if (res.status === 401) {
      alert('로그인이 필요합니다.');
    } else if (res.status === 403) {
      alert('본인이 작성한 질문만 수정할 수 있습니다.');
    } else if (res.status === 404) {
      alert('존재하지 않는 질문입니다.');
    } else {
      res.json().catch(() => null).then(body => {
        alert((body && body.message) || '수정에 실패했습니다.');
      });
    }
  });
});
