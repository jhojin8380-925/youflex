document.getElementById('qnaSaveBtn').addEventListener('click', () => {
  if (!document.getElementById('qna_title').value.trim()) {
    alert('제목을 입력해주세요.');
    return;
  }
  if (!document.getElementById('qna_content').value.trim()) {
    alert('내용을 입력해주세요.');
    return;
  }
  const visibility = document.querySelector('input[name="qna_is_secret"]:checked').value === 'Y' ? '비공개' : '공개';
  alert(`질문이 수정되었습니다. (${visibility}, 데모)`);
  location.href = '/notice?hash=qna';
});
