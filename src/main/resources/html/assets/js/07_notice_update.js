document.getElementById('noticeSaveBtn').addEventListener('click', () => {
  if (!document.getElementById('notice_title').value.trim()) {
    alert('제목을 입력해주세요.');
    return;
  }
  alert('공지사항이 수정되었습니다. (데모)');
  location.href = '06_notice_detail.html';
});
