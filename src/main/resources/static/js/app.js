// ==========================================================================
// OTT 리뷰 웹사이트 - 화면 초안 공통 인터랙션 (와이어프레임 목업용)
// ==========================================================================


/** 알림 시각 포맷팅 - occurredAt(서버가 내려준 실제 발생 시각)이 있으면 그걸 쓰고,
 *  없으면(경고/강퇴처럼 실시간 푸시만 있고 별도 시각 필드가 없는 경우) 현재 시각 사용 */
function formatNotifTime(occurredAt) {
    const d = occurredAt ? new Date(occurredAt) : new Date();
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

/** 알림 발생 날짜 포맷 (예: 2026.07.23) */
function formatNotifDate(occurredAt) {
    const d = occurredAt ? new Date(occurredAt) : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}`;
}

/** 헤더 🔔 알림 전용 채널(/sub/member/{id}/alert)로 오는 알림 종류별 아이콘 매핑
 *  (경고 부여 / 내 글 댓글 / QNA 답변완료 - NotificationsService.notify가 보내는 type과 매칭) */
function getHeaderNotifIcon(type) {
    if (type === "경고") return "⚠️";
    if (type === "댓글" || type === "대댓글") return "💬";
    if (type === "QNA답변") return "📩";
    if (type === "좋아요") return "❤️";
    if (type === "신고처리완료") return "🚩";
    return "🔔";
}

// ==========================================================================
// ★ 헤더 🔔 알림 패널 관리 (헤더 전용)
// ==========================================================================
let notificationList = []; // 헤더 알림 목록 배열
let notificationIdSeq = 1; // 알림 항목별 개별 삭제를 위한 고유 id 발급 카운터

/** 헤더 🔔 버튼 위 알림 뱃지 갱신 */
function updateNotifBadge() {
    const el = document.getElementById("notifUnreadBadge");
    if (!el) return;
    const unread = notificationList.filter(n => !n.read).length;
    if (unread > 0) {
        el.textContent = unread > 99 ? "99+" : unread;
        el.style.display = "inline-flex";
    } else {
        el.style.display = "none";
    }
}

/** 헤더 알림 패널 목록 렌더링 */
function renderNotificationList() {
    const listEl = document.getElementById("notificationList");
    const emptyEl = document.getElementById("notifEmptyMsg");
    if (!listEl) return;
    listEl.querySelectorAll(".notification-item").forEach(el => el.remove());
    if (notificationList.length === 0) {
        if (emptyEl) emptyEl.style.display = "block";
        return;
    }
    if (emptyEl) emptyEl.style.display = "none";
    [...notificationList].reverse().forEach(notif => {
        const item = document.createElement("div");
        item.className = "notification-item" + (notif.read ? "" : " unread");
        item.innerHTML = `
            <span class="notification-icon">${notif.icon}</span>
            <div style="flex:1; min-width:0;">
                <div class="notification-text">${notif.text}</div>
                <div class="notification-date">${notif.date}</div>
                <div class="notification-time">${notif.time}</div>
            </div>
            <button type="button" class="notification-delete" aria-label="알림 삭제" data-notif-id="${notif.id}">✕</button>
        `;
        listEl.insertBefore(item, listEl.firstChild);
    });
}

/** 헤더 알림 패널 최초 로드 - DB(notifications 테이블)에서 최신순으로 불러와 새로고침/재접속해도 유지되게 함 */
async function loadNotificationsFromServer() {
    try {
        const response = await fetch("/api/notifications");
        if (!response.ok) return;
        const list = await response.json();
        notificationList = list.map(n => ({
            id: n.notificationsId,
            icon: getHeaderNotifIcon(n.notificationsType),
            text: n.notificationsContent,
            date: formatNotifDate(n.notificationsCreatedAt),
            time: formatNotifTime(n.notificationsCreatedAt),
            read: n.notificationsReadStatus === "읽음"
        })).reverse(); // 서버는 최신순(DESC)으로 내려주므로, push 기반 렌더링과 맞추기 위해 오래된 순으로 뒤집음
        updateNotifBadge();
    } catch (error) {
        console.error("알림 목록 로딩 실패:", error);
    }
}

/** 헤더 알림 패널에 새 알림 추가 (occurredAt: 서버가 내려준 실제 발생 시각, id: 서버(notifications 테이블)가 발급한 실제 id) */
function addNotification(icon, text, occurredAt, id) {
    const timeStr = formatNotifTime(occurredAt);
    const dateStr = formatNotifDate(occurredAt);
    notificationList.push({ id: id != null ? id : notificationIdSeq++, icon, text, time: timeStr, date: dateStr, read: false });
    // ★ 저장 개수 상한을 99+ 표시 기준(99)보다 높게 잡아야 실제로 "99+"가 뜰 수 있음
    if (notificationList.length > 100) notificationList.shift();
    updateNotifBadge();
    const panel = document.getElementById("notificationPanel");
    if (panel && panel.classList.contains("open")) {
        renderNotificationList();
    }
}

/** 헤더 알림 목록에서 개별 항목 삭제 (개별 삭제(✕) 버튼 클릭 시 호출, DB에서도 함께 삭제) */
function removeNotification(notifId) {
    notificationList = notificationList.filter(n => n.id !== notifId);
    updateNotifBadge();
    renderNotificationList();
    fetch(`/api/notifications/${notifId}`, { method: "DELETE" }).catch(err => console.error("알림 삭제 실패:", err));
}

/** 헤더 알림 패널 열기 – 모두 읽음 처리 (DB에도 반영) */
function openNotificationPanel() {
    notificationList.forEach(n => n.read = true);
    updateNotifBadge();
    renderNotificationList();
    fetch("/api/notifications/read", { method: "POST" }).catch(err => console.error("알림 읽음 처리 실패:", err));
}

// ==========================================================================
// 헤더 🔔 알림 패널 이벤트 바인딩 (기존 initChatroomChat()에서 분리)
// - DOMContentLoaded에서 initChatroomChat()과 함께 별도로 호출됨
// ==========================================================================
function initHeaderNotifications() {
    // ★ 🔔 알림 아이콘 클릭 → 알림 패널 열기 & 읽음 처리
    const notificationTrigger = document.getElementById("notificationTrigger");
    if (notificationTrigger) {
        notificationTrigger.addEventListener("click", () => {
            openNotificationPanel();
        });
    }

    // ★ 알림 전체 삭제 버튼 (DB에서도 함께 삭제)
    const notificationClearBtn = document.getElementById("notificationClearBtn");
    if (notificationClearBtn) {
        notificationClearBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            notificationList = [];
            updateNotifBadge();
            renderNotificationList();
            fetch("/api/notifications", { method: "DELETE" }).catch(err => console.error("알림 전체 삭제 실패:", err));
        });
    }

    // ★ 헤더 알림 개별 삭제(✕) 버튼: 목록이 매번 다시 그려지므로 위임 방식으로 처리
    const notificationListEl = document.getElementById("notificationList");
    if (notificationListEl) {
        notificationListEl.addEventListener("click", (e) => {
            const delBtn = e.target.closest(".notification-delete");
            if (!delBtn) return;
            e.stopPropagation();
            removeNotification(Number(delBtn.dataset.notifId));
        });
    }
}

// ==========================================================================
// 오버레이 패널 공통 함수 (퀴즈 / 채팅방 / 알림 패널이 모두 이 함수를 재사용함)
// ==========================================================================
/**
 * @param panelId          열고 닫을 패널(aside)의 id
 * @param backdropId       패널 뒤 어두운 배경(overlay-backdrop)의 id
 * @param openTriggerIds   패널을 "여는" 버튼들의 id 배열 (예: 채팅 아이콘 버튼)
 * @param closeTriggerIds  패널을 "닫는" 버튼들의 id 배열 (예: 패널 안의 X 버튼)
 * @param bodyClass        패널이 열렸을 때 <body>에 추가할 클래스명 (스크롤 잠금 등에 사용, 없으면 null)
 * @param toggleOnTrigger  true면 여는 버튼을 다시 눌렀을 때 "닫기"로 동작(토글), false면 항상 열기만 함
 */
function initOverlay(panelId, backdropId, openTriggerIds, closeTriggerIds, bodyClass, toggleOnTrigger) {
    const panel = document.getElementById(panelId);
    const backdrop = document.getElementById(backdropId);
    if (!panel) return; // 해당 페이지에 패널 자체가 없으면 아무것도 하지 않고 종료

    // 패널을 여는 내부 함수: open 클래스를 붙여서 CSS 트랜지션으로 슬라이드인 시킴
    const open = () => {
        panel.classList.add("open");
        backdrop && backdrop.classList.add("open");
        if (bodyClass) document.body.classList.add(bodyClass);
    };
    // 패널을 닫는 내부 함수
    const close = () => {
        panel.classList.remove("open");
        backdrop && backdrop.classList.remove("open");
        if (bodyClass) document.body.classList.remove(bodyClass);
    };

    // "여는" 버튼들에 클릭 이벤트 등록
    openTriggerIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("click", () => {
            // toggleOnTrigger가 true이고 이미 열려있으면 -> 닫기, 아니면 -> 열기
            if (toggleOnTrigger && panel.classList.contains("open")) close();
            else open();
        });
    });
    // "닫는" 버튼들(패널 안의 X 버튼 등)에 클릭 이벤트 등록
    closeTriggerIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", close);
    });
    // 배경(backdrop) 클릭 시에도 닫히도록 처리
    backdrop && backdrop.addEventListener("click", close);
}

// ==========================================================================
// 탭 전환 공통 함수 (채팅방 패널의 목록/채팅/개설 탭, 마이페이지 탭 등에서 공통 사용)
// ==========================================================================
/**
 * tabGroupSelector: 탭 버튼들을 감싸는 컨테이너의 CSS 선택자
 *                   (예: ".panel-tabs" -> 채팅방 패널 상단의 [목록][채팅][개설] 버튼 그룹)
 *
 * 동작 원리:
 * 1) 탭 버튼(data-tab-target 속성을 가진 button)을 클릭하면
 * 2) 그 버튼의 data-tab-target 값과 동일한 data-tab-panel 값을 가진
 *    패널만 보이게(display:"") 하고, 나머지는 숨김(display:"none") 처리한다.
 */
function initTabs(tabGroupSelector) {
    document.querySelectorAll(tabGroupSelector).forEach((group) => {
        const buttons = group.querySelectorAll("[data-tab-target]");
        buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const targetSelector = btn.dataset.tabTarget; // 예: "chat"

                // 탭 버튼 그룹(panel-tabs)의 부모 요소를 기준으로,
                // 그 안에 있는 모든 [data-tab-panel] 요소들을 찾는다.
                const tabContainer = btn.closest("[data-tab-panels]");
                const panelGroup = (tabContainer && tabContainer.parentElement) || document;
                const panels = panelGroup.querySelectorAll("[data-tab-panel]");

                // 버튼 활성화 스타일(active 클래스) 갱신
                buttons.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");

                // 클릭한 탭에 해당하는 패널만 보여주고 나머지는 숨김
                panels.forEach((p) => {
                    p.style.display = p.dataset.tabPanel === targetSelector ? "" : "none";
                });
            });
        });
    });
}
// ==========================================================================
// ! 스크롤 항상 맨 아래로 이동시키는 공통 유틸리티 함수 추가 !
// ==========================================================================
function scrollToBottom(containerElement) {
    if (containerElement) {
        containerElement.scrollTop = containerElement.scrollHeight;
    }
}
// ==========================================================================
// 퀴즈: /api/quiz/random으로 문제를 받아 보기 버튼으로 출제하고,
// 클릭한 보기의 값을 그대로 /api/quiz/answer로 보내 채점받는다.
// 객관식/OX 합쳐서 하루 3회, 서버(quiz_attempt 테이블)가 기준으로 제한한다.
// ==========================================================================
function initQnaQuiz() {
    const startBtn = document.getElementById('qnaQuizStartBtn');
    const countLabel = document.getElementById('qnaQuizCount');
    const playBox = document.getElementById('qnaQuizPlay');
    const questionEl = document.getElementById('qnaQuizQuestion');
    const optionsBox = document.getElementById('qnaQuizOptions');
    const resultBox = document.getElementById('qnaQuizResult');
    if (!startBtn) return; // 퀴즈 UI가 없는 페이지면 종료

    let currentQuiz = null; // 지금 출제 중인 문제(quizId 포함). null이면 채점 제출을 받지 않음.

    // 남은 횟수 표시 + 시작 버튼 활성/비활성
    function renderCount(remaining) {
        countLabel.textContent = `🎯 오늘 남은 퀴즈 횟수: ${remaining}/3`;
        startBtn.disabled = remaining <= 0;
        startBtn.textContent = remaining <= 0 ? '오늘 퀴즈를 모두 사용했어요' : '퀴즈 시작';
    }

    // 보기 버튼 하나 생성: 클릭하면 그 버튼의 값을 답으로 바로 제출
    function createOptionButton(label, value) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.addEventListener('click', () => submitAnswer(btn, value));
        return btn;
    }

    function showResult(text) {
        resultBox.textContent = text;
        resultBox.style.display = 'block';
    }

    // 서버에서 문제 하나를 받아와 보기 버튼으로 출제
    function startQuiz() {
        resultBox.style.display = 'none';
        fetch('/api/quiz/random')
            .then((res) => {
                if (res.status === 401) throw new Error('unauthorized');
                if (!res.ok) throw new Error('quiz request failed');
                return res.json();
            })
            .then((data) => {
                renderCount(data.remainingAttempts);
                if (!data.quiz || !data.quiz.quizId) {
                    playBox.style.display = 'none';
                    showResult('오늘 퀴즈 응시 횟수를 모두 사용했어요. 내일 다시 도전해주세요!');
                    return;
                }
                currentQuiz = data.quiz;
                const q = data.quiz;
                questionEl.textContent = `Q. ${q.quizContent}`;
                optionsBox.innerHTML = '';
                if (q.quizType === '객관식') {
                    [q.quizOption1, q.quizOption2, q.quizOption3, q.quizOption4].forEach((opt, i) => {
                        if (opt) optionsBox.appendChild(createOptionButton(`${i + 1}) ${opt}`, String(i + 1)));
                    });
                } else {
                    optionsBox.appendChild(createOptionButton('O', 'O'));
                    optionsBox.appendChild(createOptionButton('X', 'X'));
                }
                playBox.style.display = 'block';
            })
            .catch((err) => {
                playBox.style.display = 'none';
                showResult(err.message === 'unauthorized' ? '로그인 후 이용할 수 있어요.' : '문제를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
            });
    }

    // 클릭한 보기 버튼의 값을 제출하고, 채점 결과를 표시
    function submitAnswer(selectedBtn, answer) {
        if (!currentQuiz) return;
        const quizId = currentQuiz.quizId;
        currentQuiz = null;
        Array.from(optionsBox.children).forEach((btn) => (btn.disabled = true));

        fetch('/api/quiz/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId, answer }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('answer submit failed');
                return res.json();
            })
            .then((data) => {
                selectedBtn.classList.add(data.correct ? 'correct' : 'wrong');
                const feedback = data.correct
                    ? `✅ 정답이에요! ${data.pointsAwarded}P를 적립했어요.`
                    : '❌ 아쉽지만 오답이에요.';
                showResult(data.explanation ? `${feedback} ${data.explanation}` : feedback);
                renderCount(data.remainingAttempts);
            })
            .catch(() => {
                showResult('채점 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
            });
    }

    startBtn.addEventListener('click', startQuiz);

    // 페이지 로드 시 남은 횟수만 먼저 조회해서 표시(비로그인 상태면 401이라 조용히 무시)
    fetch('/api/quiz/random')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
            if (data) renderCount(data.remainingAttempts);
        })
        .catch(() => {});
}

// ---- 취향/장르 선택 칩 (클릭 시 선택 표시 토글) ----
function initGenreChips() {
    document.querySelectorAll(".genre-chip").forEach((chip) => {
        // list.html의 상세검색 모달(listGenreModalBackdrop)은 list.js가
        // 별도로(최대 3개 제한 등) 처리하므로 여기서는 건드리지 않음
        if (chip.closest("#genreGrid")) return;
        if (chip.closest("#listGenreModalBackdrop")) return;
        chip.addEventListener("click", () => chip.classList.toggle("selected"));
    });
}

// ---- 드롭다운 메뉴 (마이페이지 등에서 사용) ----
function initDropdowns() {
    document.querySelectorAll("[data-dropdown-trigger]").forEach((trigger) => {
        const menu = document.getElementById(trigger.dataset.dropdownTrigger);
        if (!menu) return;
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.classList.toggle("open");
        });
    });
    document.addEventListener("click", () => {
        document.querySelectorAll(".dropdown-menu.open").forEach((m) => m.classList.remove("open"));
    });
}

// ---- 히어로 배너 슬라이더 (점 인디케이터로 전환되는 메인 배너) ----
function initHeroSlider() {
    const slider = document.querySelector(".hero-slider");
    const slides = document.querySelectorAll(".hero-slide-content");
    const dots = document.querySelectorAll(".hero-dots span");
    if (!slider || !slides.length) return;

    const AUTO_PLAY_MS = 3000;
    let index = 0;
    let timerId = null;

    function showSlide(i) {
        index = (i + slides.length) % slides.length;
        slides.forEach((s, n) => s.classList.toggle("active", n === index));
        dots.forEach((d, n) => d.classList.toggle("active", n === index));
    }

    function next() { showSlide(index + 1); }
    function prev() { showSlide(index - 1); }

    function startAutoPlay() {
        stopAutoPlay();
        timerId = setInterval(next, AUTO_PLAY_MS);
    }
    function stopAutoPlay() {
        if (timerId) clearInterval(timerId);
        timerId = null;
    }

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => { showSlide(i); startAutoPlay(); });
    });

    const prevBtn = document.getElementById("heroPrev");
    const nextBtn = document.getElementById("heroNext");
    if (prevBtn) prevBtn.addEventListener("click", () => { prev(); startAutoPlay(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { next(); startAutoPlay(); });

    slider.addEventListener("mouseenter", stopAutoPlay);
    slider.addEventListener("mouseleave", startAutoPlay);

    showSlide(0);
    startAutoPlay();
}

// ---- 상단 카테고리 네비게이션: 현재 보고 있는 페이지/카테고리에 맞는 탭만 빨간색으로 강조 ----
function initCategoryNav() {
    const nav = document.querySelector(".category-nav");
    if (!nav) return;

    const pathname = location.pathname;
    const isReviewList = pathname.endsWith("/review/list");
    const current = isReviewList
        ? new URLSearchParams(location.search).get("platform") || "all"
        : document.body.dataset.navCurrent || "";

    nav.querySelectorAll("a[data-nav]").forEach((a) => {
        a.classList.toggle("active", a.dataset.nav === current);
    });
}

function initReviewListSort() {
    const buttons = document.querySelectorAll('.sort-group button[data-sort]');
    if (!buttons.length) return;

    const searchParams = new URLSearchParams(location.search);
    const currentSort = searchParams.get('sort') || 'latest';

    buttons.forEach((button) => {
        button.classList.toggle('active', button.dataset.sort === currentSort);
        button.addEventListener('click', () => {
            if (button.dataset.sort === currentSort) return;
            searchParams.set('sort', button.dataset.sort);
            searchParams.delete('page');
            location.search = searchParams.toString();
        });
    });
}

// ==========================================================================
// DOM 로드 완료 후, 위에서 정의한 모든 초기화 함수를 순서대로 실행
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    initDropdowns();
    initHeroSlider();
    initCategoryNav();
    initReviewListSort();

    // 오버레이 3종 (퀴즈 / 채팅방 / 알림) 초기화
    initOverlay("quizPanel", "quizBackdrop", ["quizFab"], ["quizClose"], null, true);
    initOverlay("chatroomPanel", "chatroomBackdrop", ["chatroomTrigger"], ["chatroomClose"], "chatroom-open");
    initOverlay("notificationPanel", "notificationBackdrop", ["notificationTrigger"], ["notificationClose"], "notification-open");

    // 탭 전환이 필요한 모든 영역에 대해 initTabs 적용
    initTabs(".panel-tabs");
    initTabs(".mypage-tabs");
    initTabs(".admin-nav");
    initTabs(".platform-tabs");
    initTabs(".notice-tabs");

    initHeaderNotifications();
    initChatroomChat();
    initGenreChips();
    initQnaQuiz();
});

// ==========================================================================
// 스크롤 시 .section-heading이 화면에 보일 때마다 등장 애니메이션 재생
// ==========================================================================
const headings = document.querySelectorAll('.section-heading');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            void entry.target.offsetWidth;
            entry.target.style.animation = 'heading-shine 4s ease-in-out infinite, heading-fade-in 0.6s ease-out';
        }
    });
}, { threshold: 0.3 });

headings.forEach(h => observer.observe(h));

// ---- 푸터: 맨 위로 가기 버튼 ----
const footerTopBtn = document.getElementById("footerTopBtn");
if (footerTopBtn) {
    footerTopBtn.addEventListener("click", function() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}