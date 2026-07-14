document.getElementById('advToggleBtn').addEventListener('click', () => {
  document.getElementById('advPanel').classList.toggle('open');
});
document.querySelectorAll('.sort-group button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-group button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// 상세검색 안 "취향 선택" 버튼 -> 마이페이지와 같은 취향(장르) 선택 모달
document.getElementById('listTasteBtn').addEventListener('click', () => {
  document.getElementById('listGenreModalBackdrop').classList.add('open');
});
document.getElementById('listGenreCancelBtn').addEventListener('click', () => {
  document.getElementById('listGenreModalBackdrop').classList.remove('open');
});
document.getElementById('listGenreApplyBtn').addEventListener('click', () => {
  document.getElementById('listGenreModalBackdrop').classList.remove('open');
});
