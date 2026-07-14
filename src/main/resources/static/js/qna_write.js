document.getElementById('qnaSubmitBtn').addEventListener('click', async () => {
  const title = document.getElementById('qna_title').value.trim();
  const content = document.getElementById('qna_content').value.trim();
  const isSecret = document.querySelector('input[name="qna_is_secret"]:checked').value;

  if (!title) { alert('제목을 입력해주세요.'); return; }
  if (!content) { alert('내용을 입력해주세요.'); return; }

  // 서버로 보낼 데이터
  const requestData = {
    qnaTitle: title,
    qnaContent: content,
    qnaIsSecret: isSecret
  };

  try {
    // [중요] 여기서 실제로 서버 API를 호출합니다.
    const response = await fetch('/api/qna', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (response.ok) {
      alert('질문이 등록되었습니다.');
      location.href = '/notice?hash=qna'; // 저장 성공 후 이동
    } else {
      alert('저장에 실패했습니다. 관리자에게 문의하세요.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('서버와 연결할 수 없습니다.');
  }
});