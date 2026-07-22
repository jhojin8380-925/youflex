
// 신고 모달을 열 때 어떤 대상(게시글/댓글)을 신고하는 중인지, 댓글이면 어떤 댓글인지 기억해둠
let reportTargetType = 'post';
let reportTargetCommentId = null;

function openReportModal(targetType, el) {
  reportTargetType = targetType;
  reportTargetCommentId = targetType === 'comment' && el ? el.closest('.comment-item, .reply-item').dataset.commentId : null;
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
  const reason = document.getElementById('reportReasonSelect').value;
  const content = document.getElementById('reportDetailInput').value.trim();
  const isComment = reportTargetType === 'comment';

  // 게시글 신고(ReviewController)와 댓글 신고(CommentController)는 요청 바디의 필드명이 다름
  const url = isComment
    ? `/api/reviews/comments/${reportTargetCommentId}/report`
    : `/review/${document.getElementById('currentReviewId').value}/report`;
  const body = isComment
    ? { commentReportReason: reason, commentReportContent: content }
    : { reason, content };

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (res.status === 401) {
        alert('로그인 후 이용할 수 있어요.');
        return;
      }
      if (!res.ok) throw new Error('report failed');
      alert('신고가 접수되었습니다. 운영자 확인 후 처리됩니다.');
      closeReportModal();
    })
    .catch(() => {
      alert('신고 접수 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
    });
}

// ---- 새 댓글 등록: 입력창 내용을 등록하고, 성공하면 최신 목록/베스트댓글 반영을 위해 새로고침 ----
function submitNewComment() {
  const input = document.getElementById('comment_content');
  const content = input.value.trim();
  if (!content) return;
  const reviewId = document.getElementById('currentReviewId').value;

  fetch(`/api/reviews/${reviewId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentContent: content, parentId: 0 }),
  })
    .then((res) => {
      if (res.status === 401) {
        alert('로그인 후 이용할 수 있어요.');
        return;
      }
      if (!res.ok) {
        return res.json().catch(() => null).then((body) => {
          throw new Error((body && body.message) || '댓글 등록 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
        });
      }
      location.reload();
    })
    .catch((e) => {
      alert(e.message);
    });
}

// ---- 좋아요 토글: 누르면 서버에 등록/취소를 반영하고, 버튼 강조·카운트를 응답값으로 갱신 ----
function initReviewLike() {
  const btn = document.getElementById('likeBtn');
  const reviewIdEl = document.getElementById('currentReviewId');
  if (!btn || !reviewIdEl) return;

  btn.addEventListener('click', () => {
    fetch(`/review/${reviewIdEl.value}/like`, { method: 'POST' })
      .then((res) => {
        if (res.status === 401) {
          alert('로그인 후 이용할 수 있어요.');
          return null;
        }
        if (!res.ok) throw new Error('like failed');
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        btn.classList.toggle('active', data.liked);
        btn.textContent = `❤ 좋아요 ${data.likeCount}`;
      })
      .catch(() => {
        alert('처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
      });
  });
}

// ---- 북마크 토글: 누르면 서버에 등록/취소를 반영하고, 버튼 강조를 응답값으로 갱신 ----
function initReviewBookmark() {
  const btn = document.getElementById('bookmarkBtn');
  const reviewIdEl = document.getElementById('currentReviewId');
  if (!btn || !reviewIdEl) return;

  btn.addEventListener('click', () => {
    fetch(`/review/${reviewIdEl.value}/bookmark`, { method: 'POST' })
      .then((res) => {
        if (res.status === 401) {
          alert('로그인 후 이용할 수 있어요.');
          return null;
        }
        if (!res.ok) throw new Error('bookmark failed');
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        btn.classList.toggle('active', data.bookmarked);
      })
      .catch(() => {
        alert('처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
      });
  });
}

initReviewLike();
initReviewBookmark();

// ---- 게시글 삭제: 작성자 본인 확인 후 서버에 반영, 성공하면 메인으로 이동 ----
function deleteReview() {
  if (!confirm('게시글을 삭제하시겠습니까? 삭제한 글은 복구할 수 없습니다.')) return;
  const reviewId = document.getElementById('currentReviewId').value;

  fetch(`/review/${reviewId}`, { method: 'DELETE' })
    .then((res) => {
      if (res.status === 401) {
        alert('로그인 후 이용할 수 있어요.');
        return;
      }
      if (res.status === 403) {
        alert('삭제 권한이 없어요.');
        return;
      }
      if (!res.ok) throw new Error('review delete failed');
      alert('게시글이 삭제되었습니다.');
      location.href = '/';
    })
    .catch(() => {
      alert('게시글 삭제 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
    });
}

// ---- 댓글/대댓글 좋아요 토글: 서버에 등록/취소를 반영하고, 강조·카운트를 응답값으로 갱신 ----
function toggleCommentLike(el) {
  const unit = el.closest('.comment-item, .reply-item');
  if (!unit) return;
  const commentId = unit.dataset.commentId;

  fetch(`/api/reviews/comments/${commentId}/like`, { method: 'POST' })
    .then((res) => {
      if (res.status === 401) {
        alert('로그인 후 이용할 수 있어요.');
        return null;
      }
      if (!res.ok) throw new Error('comment like failed');
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      el.classList.toggle('liked', data.liked);
      el.textContent = `♥ 좋아요 ${data.likeCount}`;
    })
    .catch(() => {
      alert('처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
    });
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

// ---- 답글 작성폼의 "등록" 클릭 시 서버에 등록하고, 성공하면 새로고침해서 대댓글로 반영 ----
function submitReplyForm(btn) {
  const form = btn.closest('.reply-form');
  const unit = btn.closest('.comment-item, .reply-item');
  if (!form || !unit) return;
  const input = form.querySelector('input');
  const content = input.value.trim();
  if (!content) return;
  const reviewId = document.getElementById('currentReviewId').value;
  const parentId = unit.dataset.commentId;

  fetch(`/api/reviews/${reviewId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentContent: content, parentId: Number(parentId) }),
  })
    .then((res) => {
      if (res.status === 401) {
        alert('로그인 후 이용할 수 있어요.');
        return;
      }
      if (!res.ok) {
        return res.json().catch(() => null).then((body) => {
          throw new Error((body && body.message) || '답글 등록 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
        });
      }
      location.reload();
    })
    .catch((e) => {
      alert(e.message);
    });
}

// ---- 댓글/대댓글 "삭제" 클릭 시 확인 후 서버에 소프트 삭제 반영, 성공하면 새로고침 ----
function deleteComment(el) {
  const unit = el.closest('.comment-item, .reply-item');
  if (!unit) return;
  if (!confirm('댓글을 삭제하시겠습니까?')) return;
  const commentId = unit.dataset.commentId;

  fetch(`/api/reviews/comments/${commentId}`, { method: 'DELETE' })
    .then((res) => {
      if (res.status === 401) {
        alert('로그인 후 이용할 수 있어요.');
        return;
      }
      if (!res.ok) throw new Error('comment delete failed');
      location.reload();
    })
    .catch(() => {
      alert('댓글 삭제 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
    });
}

// ---- 댓글/대댓글 "수정" 클릭 시 본문을 입력창으로 바꾸고, "저장" 클릭 시 서버에 반영 후 새로고침 ----
function editComment(el) {
  const unit = el.closest('.comment-item, .reply-item');
  if (!unit) return;
  const commentId = unit.dataset.commentId;
  const body = unit.querySelector(':scope > .c-body');
  if (!body || unit.querySelector(':scope > .comment-edit-form')) return;

  const form = document.createElement('div');
  form.className = 'comment-edit-form';
  form.innerHTML =
    '<input type="text" /><button type="button" class="btn btn-primary btn-sm">저장</button>';
  const input = form.querySelector('input');
  input.value = body.textContent.trim();

  form.querySelector('button').addEventListener('click', () => {
    const newContent = input.value.trim();
    if (!newContent) return;

    fetch(`/api/reviews/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentContent: newContent }),
    })
      .then((res) => {
        if (res.status === 401) {
          alert('로그인 후 이용할 수 있어요.');
          return;
        }
        if (!res.ok) {
          return res.json().catch(() => null).then((body) => {
            throw new Error((body && body.message) || '댓글 수정 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
          });
        }
        location.reload();
      })
      .catch((e) => {
        alert(e.message);
      });
  });

  body.style.display = 'none';
  body.after(form);
  input.focus();
}

