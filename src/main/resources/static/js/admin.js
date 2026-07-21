// URL의 ?tab= 값으로 특정 관리자 탭을 자동으로 열어줌 (예: Q&A 답변 후 /admin?tab=qna로 복귀)
// initTabs(".admin-nav")가 클릭 리스너를 붙인 뒤에 실행돼야 하므로, app.js보다 뒤에 등록되는
// 이 DOMContentLoaded 리스너에서 처리 (리스너는 등록 순서대로 실행됨)
document.addEventListener("DOMContentLoaded", () => {
  const targetTab = new URLSearchParams(location.search).get("tab");
  if (!targetTab) return;
  const tabButton = document.querySelector(`.admin-nav [data-tab-target="${targetTab}"]`);
  if (tabButton) tabButton.click();
});

const BANNER_API_BASE = "/api/banner";

let editingBannerRow = null;
let currentBannerFile = null; // 실제 업로드할 File 객체(미리보기용 data URL과는 별개)

const bannerFileInput = document.getElementById("banner_img");
const bannerImagePreview = document.getElementById("bannerImagePreview");
const bannerUploadPlaceholder = document.getElementById("bannerUploadPlaceholder");

document.getElementById("bannerImageTrigger").addEventListener("click", () => bannerFileInput.click());
bannerFileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("이미지 파일만 업로드할 수 있습니다.");
    bannerFileInput.value = "";
    return;
  }
  currentBannerFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    bannerImagePreview.src = e.target.result;
    bannerImagePreview.style.display = "block";
    bannerUploadPlaceholder.style.display = "none";
  };
  reader.readAsDataURL(file);
});

// existingImageName: 수정 모달을 열 때 기존 배너의 저장된 파일명(row.dataset.image)
function setBannerImagePreview(existingImageName) {
  if (existingImageName) {
    bannerImagePreview.src = `/upload/${existingImageName}`;
    bannerImagePreview.style.display = "block";
    bannerUploadPlaceholder.style.display = "none";
  } else {
    bannerImagePreview.style.display = "none";
    bannerUploadPlaceholder.style.display = "";
  }
}

function openBannerModal(btn) {
  editingBannerRow = btn ? btn.closest("tr") : null;
  currentBannerFile = null;
  document.getElementById("bannerModalTitle").textContent = editingBannerRow ? "🖼 배너 수정" : "🖼 배너 추가";
  document.getElementById("bannerBadgeInput").value = editingBannerRow ? editingBannerRow.dataset.badge : "";
  document.getElementById("banner_title").value = editingBannerRow ? editingBannerRow.dataset.title : "";
  document.getElementById("banner_content").value = editingBannerRow ? editingBannerRow.dataset.desc : "";
  bannerFileInput.value = "";
  setBannerImagePreview(editingBannerRow ? editingBannerRow.dataset.image : "");
  document.getElementById("bannerModalBackdrop").classList.add("open");
}
function closeBannerModal() {
  document.getElementById("bannerModalBackdrop").classList.remove("open");
}

// adminFetch는 Content-Type: application/json을 강제로 붙이는데, multipart/form-data는
// 브라우저가 boundary를 포함해 자동으로 설정해야 하므로 별도의 fetch 래퍼를 쓴다.
async function bannerFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = "요청 처리 중 오류가 발생했습니다.";
    try {
      const body = await res.json();
      if (body && body.message) message = body.message;
    } catch (e) {
      // 응답 바디가 없거나 JSON이 아닌 경우 기본 메시지 사용
    }
    throw new Error(message);
  }
}

async function saveBanner() {
  const badge = document.getElementById("bannerBadgeInput").value.trim();
  const title = document.getElementById("banner_title").value.trim();
  const desc = document.getElementById("banner_content").value.trim();
  if (!title) {
    alert("배너 제목을 입력해주세요.");
    return;
  }
  if (!editingBannerRow && !currentBannerFile) {
    alert("배너 이미지를 첨부해주세요.");
    return;
  }

  const formData = new FormData();
  formData.append("bannerBadge", badge);
  formData.append("bannerTitle", title);
  formData.append("bannerContent", desc);
  if (currentBannerFile) {
    formData.append("bannerImgFile", currentBannerFile);
  }

  try {
    if (editingBannerRow) {
      await bannerFetch(`${BANNER_API_BASE}/${editingBannerRow.dataset.bannerId}`, { method: "PUT", body: formData });
    } else {
      await bannerFetch(BANNER_API_BASE, { method: "POST", body: formData });
    }
    closeBannerModal();
    // 그냥 location.reload()를 쓰면 현재 주소(tab= 없는 /admin)를 그대로 새로고침해서
    // 첫 번째 탭(회원 관리)으로 돌아가버리므로, 배너 탭으로 명시적으로 이동
    location.href = "/admin?tab=banner";
  } catch (e) {
    alert(e.message);
  }
}

async function deleteBannerRow(btn) {
  const row = btn.closest("tr");
  if (!confirm("이 배너를 삭제하시겠습니까?")) return;
  try {
    await adminFetch(`${BANNER_API_BASE}/${row.dataset.bannerId}`, { method: "DELETE" });
    row.remove();
    renumberBannerRows();
  } catch (e) {
    alert(e.message);
  }
}
function renumberBannerRows() {
  Array.from(document.getElementById("bannerTableBody").children).forEach((r, i) => {
    if (r.children.length > 1) r.children[0].textContent = i + 1;
  });
}

// ==========================================================================
// 관리자 - 회원 관리 탭 (회원 목록 / 등업 신청 대기 / 탈퇴 신청 대기)
// ==========================================================================
const MEMBER_API_BASE = "/api/admin/members";

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 관리자 API 공용 fetch 래퍼. 실패 시 서버가 내려준 message(있으면)로 에러를 던짐.
async function adminFetch(url, options) {
  const res = await fetch(url, Object.assign({ headers: { "Content-Type": "application/json" } }, options || {}));
  if (!res.ok) {
    let message = "요청 처리 중 오류가 발생했습니다.";
    try {
      const body = await res.json();
      if (body && body.message) message = body.message;
    } catch (e) {
      // 응답 바디가 없거나 JSON이 아닌 경우 기본 메시지 사용
    }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const memberListState = { keyword: "", page: 1 };

function renderMemberRow(m) {
  const tr = document.createElement("tr");
  tr.dataset.memberId = m.memberId;
  tr.dataset.memberName = m.memberName;
  tr.innerHTML = `
    <td>${m.memberId}</td>
    <td>${escapeHtml(m.memberLoginid) || "-"}</td>
    <td>${escapeHtml(m.memberName)}</td>
    <td>${escapeHtml(m.memberEmail)}</td>
    <td>${(m.memberCreatedAt || "").slice(0, 10)}</td>
    <td>${m.warningCount ?? 0}/3</td>
    <td class="actions">
      <button type="button" class="btn btn-sm btn-danger" onclick="openWarningModal(this)">경고처리</button>
      <button type="button" class="btn btn-sm" onclick="openWarningRevokeModal(this)">경고 차감</button>
      <button type="button" class="btn btn-sm btn-danger" onclick="forceWithdrawMember(this)">강제탈퇴</button>
    </td>`;
  return tr;
}

function renderMemberPagination(totalPages, currentPage) {
  const paginationEl = document.getElementById("memberPagination");
  if (!paginationEl) return;
  paginationEl.innerHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = i;
    btn.className = i === currentPage ? "active" : "";
    btn.addEventListener("click", () => loadMemberList(i));
    paginationEl.appendChild(btn);
  }
}

async function loadMemberList(page) {
  memberListState.page = page || 1;
  const tbody = document.getElementById("memberListBody");
  if (!tbody) return;
  try {
    const params = new URLSearchParams({ keyword: memberListState.keyword, page: memberListState.page });
    const data = await adminFetch(`${MEMBER_API_BASE}?${params.toString()}`);
    tbody.innerHTML = "";
    if (!data.members.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align:center">등록된 회원이 없습니다.</td></tr>';
    } else {
      data.members.forEach((m) => tbody.appendChild(renderMemberRow(m)));
    }
    renderMemberPagination(data.totalPages, data.page);
  } catch (e) {
    alert(e.message);
  }
}

(function initMemberList() {
  const searchInput = document.getElementById("memberSearchInput");
  const searchBtn = document.getElementById("memberSearchBtn");
  const table = document.getElementById("memberListTable");
  if (!searchInput || !searchBtn || !table) return;

  const triggerSearch = () => {
    memberListState.keyword = searchInput.value.trim();
    loadMemberList(1);
  };
  searchBtn.addEventListener("click", triggerSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") triggerSearch();
  });

  // 서버가 최초 렌더한 1페이지 기준 총 개수/페이지 크기로 페이지네이션 버튼만 먼저 그림
  const totalCount = Number(table.dataset.totalCount || 0);
  const pageSize = Number(table.dataset.pageSize || 5);
  renderMemberPagination(Math.max(1, Math.ceil(totalCount / pageSize)), 1);
})();

// ---- 경고 처리 모달 (회원 관리 탭 / 신고 처리 탭 공용) ----
// 신고 처리 탭의 "경고처리" 버튼으로 열렸을 때만 채워지는 컨텍스트.
// 경고 등록이 성공하면 이 값이 있는 경우에만 해당 신고를 함께 처리완료로 전환한다.
let activeReportWarningContext = null;

function openWarningModal(btn) {
  activeReportWarningContext = null;
  const row = btn.closest("tr");
  document.getElementById("warning_target_member_id").value = row.dataset.memberId;
  document.getElementById("warning_reason").value = "";
  document.getElementById("warningModalBackdrop").classList.add("open");
}
function closeWarningModal() {
  activeReportWarningContext = null;
  document.getElementById("warningModalBackdrop").classList.remove("open");
}
async function submitWarning() {
  const memberId = document.getElementById("warning_target_member_id").value;
  const reason = document.getElementById("warning_reason").value.trim();
  if (!reason) {
    alert("경고 사유를 입력해주세요.");
    return;
  }
  const reportContext = activeReportWarningContext; // closeWarningModal이 지우기 전에 미리 캡처
  try {
    await adminFetch(`${MEMBER_API_BASE}/${memberId}/warning`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    closeWarningModal();
    if (reportContext) {
      await adminFetch(`${REPORT_API_BASE}/${reportContext.reportType}/${reportContext.reportId}/resolve`, { method: "POST" });
      markReportRowResolved(reportContext.row);
      alert("경고가 부여되고 신고가 처리완료 처리되었습니다.");
    } else {
      alert("경고가 부여되었습니다. (누적 3회 시 자동 강제탈퇴 처리됩니다)");
      await loadMemberList(memberListState.page);
    }
  } catch (e) {
    alert(e.message);
  }
}

// ---- 경고 차감 모달 ----
function openWarningRevokeModal(btn) {
  const row = btn.closest("tr");
  document.getElementById("warning_revoke_target_member_id").value = row.dataset.memberId;
  document.getElementById("warningRevokeModalBackdrop").classList.add("open");
}
function closeWarningRevokeModal() {
  document.getElementById("warningRevokeModalBackdrop").classList.remove("open");
}
async function submitWarningRevoke() {
  const memberId = document.getElementById("warning_revoke_target_member_id").value;
  try {
    await adminFetch(`${MEMBER_API_BASE}/${memberId}/warning/revoke`, { method: "POST" });
    closeWarningRevokeModal();
    alert("경고가 차감되었습니다.");
    await loadMemberList(memberListState.page);
  } catch (e) {
    alert(e.message);
  }
}

// ---- 강제탈퇴 (회원 목록 탭) ----
async function forceWithdrawMember(btn) {
  const row = btn.closest("tr");
  if (!confirm(`${row.dataset.memberName} 회원을 강제탈퇴 처리하시겠습니까?`)) return;
  try {
    await adminFetch(`${MEMBER_API_BASE}/${row.dataset.memberId}/force-withdraw`, { method: "POST" });
    row.remove();
    alert("강제탈퇴 처리되었습니다. (탈퇴 신청 대기 탭에서 최종 승인/반려할 수 있습니다)");
  } catch (e) {
    alert(e.message);
  }
}

// ---- 등업 신청 대기 탭 ----
async function approveGrade(btn) {
  const row = btn.closest("tr");
  if (!confirm(`${row.dataset.memberName} 회원을 평론가로 등업하시겠습니까?`)) return;
  try {
    await adminFetch(`${MEMBER_API_BASE}/${row.dataset.memberId}/grade/approve`, { method: "POST" });
    row.remove();
  } catch (e) {
    alert(e.message);
  }
}
async function rejectGrade(btn) {
  const row = btn.closest("tr");
  if (!confirm(`${row.dataset.memberName} 회원의 등업 신청을 반려하시겠습니까?`)) return;
  try {
    await adminFetch(`${MEMBER_API_BASE}/${row.dataset.memberId}/grade/reject`, { method: "POST" });
    row.remove();
  } catch (e) {
    alert(e.message);
  }
}

// ---- 탈퇴 신청 대기 탭 ----
async function approveWithdraw(btn) {
  const row = btn.closest("tr");
  if (!confirm(`${row.dataset.memberName} 회원을 탈퇴 승인하시겠습니까?\n계정 정보와 작성글/댓글이 모두 삭제되며 되돌릴 수 없습니다.`)) return;
  try {
    await adminFetch(`${MEMBER_API_BASE}/${row.dataset.memberId}/withdraw/approve`, { method: "POST" });
    row.remove();
  } catch (e) {
    alert(e.message);
  }
}
async function rejectWithdraw(btn) {
  const row = btn.closest("tr");
  if (!confirm(`${row.dataset.memberName} 회원의 탈퇴 신청을 반려하고 계정을 복구하시겠습니까?`)) return;
  try {
    await adminFetch(`${MEMBER_API_BASE}/${row.dataset.memberId}/withdraw/reject`, { method: "POST" });
    row.remove();
  } catch (e) {
    alert(e.message);
  }
}

// ==========================================================================
// 관리자 - 공지사항 등록 탭
// ==========================================================================
const NOTICE_API_BASE = "/api/notice";

document.getElementById("noticeCreateBtn").addEventListener("click", async () => {
  const titleInput = document.getElementById("notice_title");
  const contentInput = document.getElementById("notice_content");
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title) {
    alert("제목을 입력해주세요.");
    return;
  }
  if (!content) {
    alert("내용을 입력해주세요.");
    return;
  }
  try {
    await adminFetch(NOTICE_API_BASE, {
      method: "POST",
      body: JSON.stringify({ noticeTitle: title, noticeContent: content }),
    });
    location.href = "/notice";
  } catch (e) {
    alert(e.message);
  }
});

// ==========================================================================
// 관리자 - 신고 처리 탭
// ==========================================================================
const REPORT_API_BASE = "/api/admin/reports";

// 신고 1건을 처리 상태로 표시하고 반려/경고처리/삭제 버튼을 비활성화.
// label/pillClass를 넘기지 않으면 반려/경고처리(콘텐츠는 그대로 유지)에 해당하는 기본값을 사용.
function markReportRowResolved(row, label, pillClass) {
  // 열 순서: No/대상/내용요약/작성자/신고자/사유/접수일/상태/액션 -> 상태는 7번 인덱스
  const statusCell = row.children[7];
  statusCell.innerHTML = `<span class="status-pill ${pillClass || "status-active"}">${label || "처리완료 (유지)"}</span>`;
  row.querySelectorAll(".actions button").forEach((btn) => (btn.disabled = true));
}

async function rejectReport(btn) {
  const row = btn.closest("tr");
  if (!confirm("이 신고를 반려(콘텐츠 유지) 처리하시겠습니까?")) return;
  try {
    await adminFetch(`${REPORT_API_BASE}/${row.dataset.reportType}/${row.dataset.reportId}/resolve`, { method: "POST" });
    markReportRowResolved(row);
  } catch (e) {
    alert(e.message);
  }
}

// 신고된 원본 콘텐츠(게시글/댓글/QNA/QNA댓글)를 실제로 삭제하고 신고를 처리완료 처리
async function deleteReportedContent(btn) {
  const row = btn.closest("tr");
  if (!confirm("신고된 원본 콘텐츠를 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
  try {
    await adminFetch(`${REPORT_API_BASE}/${row.dataset.reportType}/${row.dataset.reportId}`, {
      method: "DELETE",
      body: JSON.stringify({ targetId: Number(row.dataset.targetId) }),
    });
    // 내용 요약 칸(3번째 열)은 이미 삭제된 원본 콘텐츠의 옛 텍스트라 그대로 두면 오해의 소지가 있어 갱신
    row.children[2].textContent = "삭제된 콘텐츠입니다";
    markReportRowResolved(row, "삭제완료", "status-blacklist");
    alert("신고된 콘텐츠가 삭제되었습니다.");
  } catch (e) {
    alert(e.message);
  }
}

// 경고 처리 모달(회원 관리 탭과 공용)을 열되, 신고 컨텍스트를 함께 기록해둔다.
function openReportWarningModal(btn) {
  const row = btn.closest("tr");
  activeReportWarningContext = {
    reportType: row.dataset.reportType,
    reportId: row.dataset.reportId,
    row,
  };
  document.getElementById("warning_target_member_id").value = row.dataset.reportedMemberId;
  document.getElementById("warning_reason").value = "";
  document.getElementById("warningModalBackdrop").classList.add("open");
}

// 신고 목록을 10개 단위로 나눠 보여주는 클라이언트 페이지네이션.
// 서버가 신고 목록 전체를 이미 SSR로 다 내려주므로(별도 페이징 API 없음), tbody의
// <tr>들을 그룹으로 나눠 display만 토글하는 방식으로 처리한다 (notice.js와 동일한 패턴).
function initTablePagination(tbodyId, paginationId, pageSize) {
  const tbody = document.getElementById(tbodyId);
  const paginationEl = document.getElementById(paginationId);
  if (!tbody || !paginationEl) return;

  const rows = Array.from(tbody.children).filter((tr) => !tr.querySelector("td[colspan]"));
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  let currentPage = 1;

  function createPageBtn(label, extraClass, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = extraClass ? `page-btn ${extraClass}` : "page-btn";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function render() {
    rows.forEach((tr, i) => {
      const page = Math.floor(i / pageSize) + 1;
      tr.style.display = page === currentPage ? "" : "none";
    });

    paginationEl.innerHTML = "";
    paginationEl.appendChild(createPageBtn("‹", "prev", () => currentPage > 1 && goTo(currentPage - 1)));
    for (let i = 1; i <= totalPages; i++) {
      paginationEl.appendChild(createPageBtn(i, i === currentPage ? "active" : "", () => goTo(i)));
    }
    paginationEl.appendChild(createPageBtn("›", "next", () => currentPage < totalPages && goTo(currentPage + 1)));
  }

  function goTo(page) {
    currentPage = page;
    render();
  }

  render();
}

initTablePagination("reportListBody", "reportPagination", 10);

document.querySelectorAll(".member-subtabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".member-subtabs button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll("[data-subpanel]").forEach((panel) => {
      panel.style.display = panel.dataset.subpanel === btn.dataset.subtab ? "" : "none";
    });
  });
});
