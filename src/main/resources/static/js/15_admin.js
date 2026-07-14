function openQnaModal(btn) {
  const row = btn.closest("tr");
  document.getElementById("qaQuestion").textContent = row.dataset.question;
  document.getElementById("qaAuthor").textContent = row.dataset.author;
  document.getElementById("admin_answer_content").value = row.dataset.answer || "";
  document.getElementById("qnaModalBackdrop").classList.add("open");
}
function closeQnaModal() {
  document.getElementById("qnaModalBackdrop").classList.remove("open");
}
function submitQnaAnswer() {
  const val = document.getElementById("admin_answer_content").value.trim();
  if (!val) {
    alert("답변 내용을 입력해주세요.");
    return;
  }
  alert("답변이 등록되었습니다. (데모)");
  closeQnaModal();
}

let editingBannerRow = null;
let currentBannerImage = "";

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
  const reader = new FileReader();
  reader.onload = (e) => {
    currentBannerImage = e.target.result;
    bannerImagePreview.src = currentBannerImage;
    bannerImagePreview.style.display = "block";
    bannerUploadPlaceholder.style.display = "none";
  };
  reader.readAsDataURL(file);
});

function setBannerImagePreview(src) {
  currentBannerImage = src || "";
  if (currentBannerImage) {
    bannerImagePreview.src = currentBannerImage;
    bannerImagePreview.style.display = "block";
    bannerUploadPlaceholder.style.display = "none";
  } else {
    bannerImagePreview.style.display = "none";
    bannerUploadPlaceholder.style.display = "";
  }
}

function openBannerModal(btn) {
  editingBannerRow = btn ? btn.closest("tr") : null;
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
function saveBanner() {
  const badge = document.getElementById("bannerBadgeInput").value.trim();
  const title = document.getElementById("banner_title").value.trim();
  const desc = document.getElementById("banner_content").value.trim();
  if (!title) {
    alert("배너 제목을 입력해주세요.");
    return;
  }
  const tbody = document.getElementById("bannerTableBody");
  let row = editingBannerRow;
  if (!row) {
    row = document.createElement("tr");
    row.innerHTML = '<td></td><td><div class="banner-thumb"></div></td><td></td><td></td><td></td><td class="actions"><button class="btn btn-sm" onclick="openBannerModal(this)">수정</button><button class="btn btn-sm btn-danger" onclick="deleteBannerRow(this)">삭제</button></td>';
    tbody.appendChild(row);
  }
  row.dataset.badge = badge;
  row.dataset.title = title;
  row.dataset.desc = desc;
  row.dataset.image = currentBannerImage;
  row.children[1].innerHTML = currentBannerImage
    ? `<div class="banner-thumb"><img src="${currentBannerImage}" alt="배너 이미지" /></div>`
    : '<div class="banner-thumb"></div>';
  row.children[2].textContent = badge;
  row.children[3].textContent = title;
  row.children[4].textContent = desc;
  renumberBannerRows();

  closeBannerModal();
  alert("배너가 저장되었습니다. (데모)");
}
function deleteBannerRow(btn) {
  btn.closest("tr").remove();
  renumberBannerRows();
}
function renumberBannerRows() {
  Array.from(document.getElementById("bannerTableBody").children).forEach((r, i) => {
    r.children[0].textContent = i + 1;
  });
}

(function initMemberList() {
  const PAGE_SIZE = 5;
  const searchInput = document.getElementById("memberSearchInput");
  const searchBtn = document.getElementById("memberSearchBtn");
  const tbody = document.querySelector("#memberListTable tbody");
  const paginationEl = document.getElementById("memberPagination");
  const allRows = Array.from(tbody.querySelectorAll("tr"));
  let currentPage = 1;

  function getFilteredRows() {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter((row) => {
      const id = row.children[1].textContent.toLowerCase();
      const name = row.children[2].textContent.toLowerCase();
      const email = row.children[3].textContent.toLowerCase();
      return id.includes(term) || name.includes(term) || email.includes(term);
    });
  }

  function render() {
    const filtered = getFilteredRows();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    allRows.forEach((row) => (row.style.display = "none"));
    const start = (currentPage - 1) * PAGE_SIZE;
    filtered.slice(start, start + PAGE_SIZE).forEach((row) => (row.style.display = ""));

    paginationEl.innerHTML = "";
    if (filtered.length === 0) {
      paginationEl.innerHTML = '<span class="text-muted" style="font-size:13px">검색 결과가 없습니다.</span>';
      return;
    }
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = i;
      btn.className = i === currentPage ? "active" : "";
      btn.addEventListener("click", () => {
        currentPage = i;
        render();
      });
      paginationEl.appendChild(btn);
    }
  }

  searchBtn.addEventListener("click", () => {
    currentPage = 1;
    render();
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      currentPage = 1;
      render();
    }
  });

  render();
})();

document.querySelectorAll(".member-subtabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".member-subtabs button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll("[data-subpanel]").forEach((panel) => {
      panel.style.display = panel.dataset.subpanel === btn.dataset.subtab ? "" : "none";
    });
  });
});
