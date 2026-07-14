document.getElementById('qnaSubmitBtn').addEventListener('click', () => {
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
  const isSecret = document.querySelector('input[name="qna_is_secret"]:checked').value;

  fetch('/api/qna', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qnaTitle: title,
      qnaContent: content,
      qnaIsSecret: isSecret
    })
  })
    .then((res) => {
      if (res.ok) {
        location.href = '/notices?hash=qna';
      } else {
        alert('등록에 실패했습니다.');
      }
    })
    .catch(() => alert('등록 중 오류가 발생했습니다.'));
});
