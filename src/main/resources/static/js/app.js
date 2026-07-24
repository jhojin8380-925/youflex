// ==========================================================================
// OTT 리뷰 웹사이트 - 화면 초안 공통 인터랙션 (와이어프레임 목업용)
// ==========================================================================

// ==========================================================================
// 현재 입장해 있는 채팅방 ID (전역 상태)
// - enterChatroom()에서 입장에 성공하면 여기 저장
// - 나가기 버튼(chatroomLeaveBtn)에서 이 값을 사용해 어느 방을 나갈지 판단
// - 나가기 성공/패널 닫기 시 null로 초기화
// ==========================================================================
let currentChatroomId = null;

// ★ 추가: 현재 입장한 방에서 나의 역할 ("방장" / "참여자" / null)
// - 방장일 때만 메시지에 "⚠ 경고" 버튼을 노출하기 위해 사용
let currentChatroomRole = null;


let currentStompClient = null;
let currentChatroomSubscription = null;

// ★ 추가: 현재 참여 중인 채팅방이 하나라도 있는지 여부 (renderChatroomList가 갱신) - 참여 중인 방이
//   없을 때는 채팅방 알림 종 아이콘의 빨간 뱃지를 숨기기 위해 사용 (뱃지 외 나머지 UI는 그대로 유지)
let hasJoinedChatroom = false;

// ★ 추가: 현재 열려있는 방에서 "여기까지는 읽었다"의 기준이 되는 chatMessageId (localStorage에 방별로 저장)
// - null이면 이 방을 한 번도 본 적이 없다는 뜻이라, 안읽음 구분선 없이 그냥 맨 아래로 스크롤한다
let currentRoomLastReadId = null;

/** 로그인한 회원 고유 id - localStorage 키를 계정별로 분리하기 위해 사용
 *  (같은 브라우저에서 여러 계정으로 테스트/로그인할 때 "마지막으로 읽은 위치"가 서로 안 섞이도록) */
function getCurrentMemberIdForStorage() {
    const memberIdInput = document.getElementById("currentMemberId");
    return memberIdInput ? Number(memberIdInput.value) : 0;
}

function getLastReadMessageId(chatroomId) {
    const stored = localStorage.getItem(`chatLastRead_${chatroomId}_${getCurrentMemberIdForStorage()}`);
    return stored !== null ? Number(stored) : null;
}

function setLastReadMessageId(chatroomId, messageId) {
    if (!chatroomId || !messageId) return;
    localStorage.setItem(`chatLastRead_${chatroomId}_${getCurrentMemberIdForStorage()}`, String(messageId));
}

/** 채팅 패널이 열려있고 "채팅" 탭이 실제로 보이는 중인지 - 지금 보고 있으면 바로 읽음 처리하기 위해 사용 */
function isChatViewActive() {
    const panel = document.getElementById("chatroomPanel");
    if (!panel || !panel.classList.contains("open")) return false;
    const chatBody = document.querySelector('[data-tab-panel="chat"]');
    return !!(chatBody && chatBody.classList.contains("active"));
}

// ★ 추가: 읽지 않은 실시간 채팅/알림 카운트 뱃지 변수 및 함수
let unreadChatCount = 0;

/** 헤더 💬 뱃지 = 안읽은 일반 채팅 메시지 수 + 안읽은 채팅방 알림(입장/퇴장/경고/강퇴) 수
 *  (채팅방 목록의 🔔 종모양 아이콘 뱃지(cr-notif-badge, updateChatRoomNotifBadge)와 항상 합산되어 동기화됨) */
function updateChatUnreadBadge() {
    const badgeEl = document.getElementById("chatUnreadBadge") || document.querySelector("#chatroomTrigger .badge");
    if (!badgeEl) return;
    const roomNotifUnread = typeof chatRoomNotifList !== "undefined" ? chatRoomNotifList.filter(n => !n.read).length : 0;
    const total = unreadChatCount + roomNotifUnread;
    if (total > 0) {
        badgeEl.textContent = total > 99 ? "99+" : total;
        badgeEl.style.display = "inline-flex";
    } else {
        badgeEl.style.display = "none";
    }
}

function resetChatUnreadBadge() {
    unreadChatCount = 0;
    updateChatUnreadBadge();
}

function incrementChatUnreadBadge() {
    unreadChatCount++;
    updateChatUnreadBadge();
}

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

/** 채팅방 전용 🔔 알림 종류별 아이콘 매핑 (입장/퇴장/경고/강퇴 - ChatroomService.resolveChatNotifType과 매칭) */
function getChatNotifIcon(type) {
    if (type === "입장") return "🚪";
    if (type === "퇴장") return "👋";
    if (type === "경고") return "⚠️";
    if (type === "강퇴") return "🚫";
    return "💬";
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
// ★ 채팅방 전용 🔔 알림 팝업 관리 (채팅 패널 내부 전용, 헤더와 완전 별개)
// ==========================================================================
let chatRoomNotifList = []; // 채팅방 전용 알림 목록

/** 채팅방 🔔 버튼 위 뱃지 갱신 */
function updateChatRoomNotifBadge() {
    const unread = chatRoomNotifList.filter(n => !n.read).length;

    const btn = document.getElementById("openNotifPanelBtn");
    if (btn) {
        let badge = btn.querySelector(".cr-notif-badge");
        // ★ 참여 중인 채팅방이 하나도 없으면 안읽음이 있어도 종 아이콘의 빨간 뱃지는 숨김
        //   (나머지 UI - 종 아이콘 자체, "참여 중인 채팅방이 없습니다" 문구 등 - 는 그대로 유지)
        if (unread > 0 && hasJoinedChatroom) {
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "cr-notif-badge";
                badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:var(--accent);color:#fff;border-radius:50%;font-size:10px;min-width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;padding:0 3px;line-height:1;";
                btn.style.position = "relative";
                btn.appendChild(badge);
            }
            badge.textContent = unread > 99 ? "99+" : unread;
        } else {
            if (badge) badge.remove();
        }
    }

    // ★ 헤더 💬 뱃지 숫자도 이 채팅방 알림 안읽음 수만큼 함께 반영되도록 동기화
    updateChatUnreadBadge();
}

/** 채팅방 전용 알림 목록 렌더링 (#chatRoomNotifPanel 안의 #chatRoomNotifList) */
function renderChatRoomNotifList() {
    const listEl = document.getElementById("chatRoomNotifList");
    const emptyEl = document.getElementById("chatRoomNotifEmptyMsg");
    if (!listEl) return;
    listEl.querySelectorAll(".notification-item").forEach(el => el.remove());
    if (chatRoomNotifList.length === 0) {
        if (emptyEl) emptyEl.style.display = "block";
        return;
    }
    if (emptyEl) emptyEl.style.display = "none";
    [...chatRoomNotifList].reverse().forEach(notif => {
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

/** 채팅방 전용 알림 목록에서 개별 항목 삭제 (개별 삭제(✕) 버튼 클릭 시 호출, DB에서도 함께 삭제) */
function removeChatRoomNotif(notifId) {
    chatRoomNotifList = chatRoomNotifList.filter(n => n.id !== notifId);
    updateChatRoomNotifBadge();
    renderChatRoomNotifList();
    fetch(`/api/chatroom/notifications/${notifId}`, { method: "DELETE" }).catch(err => console.error("채팅방 알림 삭제 실패:", err));
}

/** 채팅방 전용 알림 슬라이드 패널 열기 – 모두 읽음 처리 (DB에도 반영) */
function openChatRoomNotifPanel() {
    const panel = document.getElementById("chatRoomNotifPanel");
    if (!panel) return;
    chatRoomNotifList.forEach(n => n.read = true);
    updateChatRoomNotifBadge();
    renderChatRoomNotifList();
    panel.classList.add("open");
    fetch("/api/chatroom/notifications/read", { method: "POST" }).catch(err => console.error("채팅방 알림 읽음 처리 실패:", err));
}

/** 채팅방 전용 알림 슬라이드 패널 닫기 */
function closeChatRoomNotifPanel() {
    const panel = document.getElementById("chatRoomNotifPanel");
    if (panel) panel.classList.remove("open");
}

/** 채팅방 전용 알림 슬라이드 패널 토글 (openNotifPanelBtn 클릭 시 호출) */
function toggleChatRoomNotifPanel() {
    const panel = document.getElementById("chatRoomNotifPanel");
    if (!panel) return;
    if (panel.classList.contains("open")) closeChatRoomNotifPanel();
    else openChatRoomNotifPanel();
}

/** 채팅방 전용 🔔 알림 목록을 DB에서 다시 불러와 갱신 (입장/퇴장/경고/강퇴 발생 시마다 호출)
 *  - ChatroomService가 이미 notifications 테이블에 적재해 두므로, 실제 notifications_id를 그대로 받아와야
 *    개별 삭제(✕)가 정확한 행을 지울 수 있다. 새로고침/재접속해도 유지됨. */
async function loadChatRoomNotificationsFromServer() {
    try {
        const response = await fetch("/api/chatroom/notifications");
        if (!response.ok) return;
        const list = await response.json();
        chatRoomNotifList = list.map(n => ({
            id: n.notificationsId,
            icon: getChatNotifIcon(n.notificationsType),
            text: n.notificationsContent,
            date: formatNotifDate(n.notificationsCreatedAt),
            time: formatNotifTime(n.notificationsCreatedAt),
            read: n.notificationsReadStatus === "읽음"
        })).reverse(); // 서버는 최신순(DESC)으로 내려주므로, push 기반 렌더링과 맞추기 위해 오래된 순으로 뒤집음
        updateChatRoomNotifBadge();
        const panel = document.getElementById("chatRoomNotifPanel");
        if (panel && panel.classList.contains("open")) {
            renderChatRoomNotifList();
        }
    } catch (error) {
        console.error("채팅방 알림 목록 로딩 실패:", error);
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

// ==========  평론가/관리자가  채팅 내에서 특정 사용자에게 경고를 부여하는 로직 =================
// ★ 수정: 닉네임 prompt 방식 대신, 메시지별 "⚠ 경고" 버튼(giveWarningToMessage)으로 대체됨.
//   케밥 메뉴의 "경고 부여" 버튼은 이제 안내만 표시한다.
function giveChatWarning() {
    if (currentChatroomRole === "방장") {
        alert("상대방 메시지에 마우스를 올리면 나타나는 '⚠ 경고' 버튼을 이용해주세요.");
    } else {
        alert("방장만 경고를 부여할 수 있습니다.");
    }
}

// ★ 추가: 특정 메시지(chatMessageId)에 경고 부여 (방장 전용)
async function giveWarningToMessage(chatMessageId) {
    const reason = prompt("경고 사유를 입력하세요.");
    if (!reason || !reason.trim()) return;

    try {
        const response = await fetch(`/api/chatroom/${currentChatroomId}/warning`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatMessageId, reason: reason.trim() })
        });

        if (!response.ok) {
            const errText = await response.text();
            alert(errText || "경고 부여에 실패했습니다.");
            return;
        }

        const data = await response.json();
        alert(data.kicked ? "경고 누적으로 해당 사용자가 강제퇴장되었습니다." : "경고가 부여되었습니다.");
    } catch (error) {
        console.error("경고 부여 실패:", error);
        alert("서버 연결에 실패했습니다.");
    }
}
/**
 * 메시지 전송 처리 함수
 */
function sendChatMessage() {
    const titleEl = document.getElementById('chatroomTitleText');
    const messagesEl = document.getElementById('chatroomMessages');
    const inputEl = document.getElementById('chat_message_content');

    // ★ 1. 선택된 방이 없는지 검증 (방 미선택 상태 차단)
    const isNoRoomSelected =
        !titleEl ||
        titleEl.innerText.includes("방 선택 없음") ||
        (messagesEl && messagesEl.querySelector('.chat-empty-state'));

    if (isNoRoomSelected) {
        alert("입장한 채팅방이 존재하지 않습니다.");
        if (inputEl) inputEl.value = ""; // 입력했던 텍스트 초기화
        return; // 전송 로직 중단
    }

    // ★ 2. 입력값 유효성 검사
    const content = inputEl ? inputEl.value.trim() : "";
    if (!content) {
        alert("메시지를 입력해 주세요.");
        return;
    }

    // ===================================================
    // ★ 3. 기존 메시지 전송 로직 (여기서부터 기존 코드 실행)
    // ===================================================
    // 예: websocket.send(...) 또는 fetch API 호출
}
// ==========================================================================
// 채팅방 목록: 렌더링 + 초기 조회(fetch) + 실시간 반영(WebSocket/STOMP)
// ==========================================================================

/**
 * ★★★ 채팅방 "입장" 버튼이 실제로 만들어지는 곳 ★★★
 *
 * 이 함수는 두 가지 상황에서 호출
 *   ① 채팅 아이콘을 눌러 패널을 열 때 -> loadChatroomList()가 서버에서
 *      최신 목록을 fetch로 받아온 뒤 호출
 *   ② 누군가 새 채팅방을 개설해서 서버가 웹소켓(STOMP)으로 최신 목록을
 *      브로드캐스트할 때 -> initChatroomSocket()의 구독 콜백에서 호출
 *
 */
/*
==================  서버에서 받은 채팅방 목록(rooms)을 화면에 그려주는(렌더링하는) 로직  ===================
*/
/**
 * 채팅방 목록을 받아서 '내가 참여 중인 방'과 '참여 가능한 방'으로 나누어 렌더링
 * @param {Array} rooms - 서버에서 받아온 채팅방 객체 배열
 *
 * ★ 수정 사항 (중복 alert / 이벤트 중복 실행 버그 수정)
 *   - 버튼에 있던 인라인 onclick="joinChatRoom(...)" / onclick="openChatRoom(...)" 제거.
 *     이 함수들은 초기 와이어프레임 목업용 더미 함수라, 실제 로직인
 *     chatroomListContainer의 이벤트 위임(addEventListener)과 함께 "이중"으로 실행되면서
 *     alert가 두 번 뜨는 원인이 되고 있었음.
 *   - "내가 참여 중인 방" 버튼에 data-joined="true" 속성 추가.
 *     기존에는 이 속성이 없어서 이벤트 위임 로직의 alreadyJoined 판정이 항상 false가 되어
 *     참여 중인 방인데도 switchToChatroom 대신 enterChatroom(재입장 API)이 호출되고 있었음.
 */
function renderChatroomList(rooms) {
    const listContainer = document.getElementById("chatroomListContainer");
    if (!listContainer) return;

    // 1. 기존 목록 초기화
    listContainer.innerHTML = "";

    // 2. 방 목록이 아예 없어도(rooms가 빈 배열) 아래 3번부터는 그대로 진행한다.
    //    joinedRooms/availableRooms가 각각 빈 배열이 되어 섹션별 "없습니다" 문구가 정상적으로 뜨고,
    //    "내가 참여 중인 방" 제목 + 🔔 종 아이콘 등 기본 UI 골격은 그대로 유지된다 (종 아이콘 뱃지만 hasJoinedChatroom로 제어).
    rooms = rooms || [];

    // 3. 참여 여부(room.joined)에 따라 두 그룹으로 분류
    const joinedRooms = rooms.filter((room) => room.joined === true);
    const availableRooms = rooms.filter((room) => room.joined !== true);
    hasJoinedChatroom = joinedRooms.length > 0;

    let html = "";

    // -------------------------------------------------------------------------
    // [섹션 1] 내가 참여 중인 방
    // -------------------------------------------------------------------------
    html += `
    <section class="room-section">
      <div class="section-title">
        <span>내가 참여 중인 방</span>
        <button type="button" id="openNotifPanelBtn" title="알림 열기" style="background:none; border:none; cursor:pointer; font-size:16px; padding:2px 4px; line-height:1; color:inherit;">🔔</button>
      </div>
  `;

    if (joinedRooms.length === 0) {
        html += `<div class="text-muted" style="padding:10px; font-size:12px; color:var(--text-2);">참여 중인 채팅방이 없습니다.</div>`;
    } else {
        // ... [내가 참여 중인 방 반복문 부분] ...
        joinedRooms.forEach((room) => {
            const currentCount = room.currentMemberCount ?? 0;
            const maxCount = room.chatroomMaxMember ?? 0;

            html += `
	    <div class="room-card joined">
	      <div class="room-info">
	        <span class="room-name">${room.chatroomTitle}</span>
	        <span class="room-meta room-meta-clickable" data-room-id="${room.chatroomId}" title="참여 중인 멤버 보기" style="cursor:pointer; text-decoration:underline dotted;">${currentCount} / ${maxCount}명</span>
	      </div>
	      <button type="button" class="btn btn-chat"
	              data-room-id="${room.chatroomId}"
	              data-room-title="${room.chatroomTitle}"
	              data-joined="true">대화하기</button>
	    </div>
	  `;
        });
    }
    html += `</section>`;

    // 섹션 구분선
    html += `<div class="divider"></div>`;

    // -------------------------------------------------------------------------
    // [섹션 2] 참여 가능한 방
    // -------------------------------------------------------------------------
    html += `
	    <section class="room-section">
	      <div class="section-title">
	        <span>🌐 참여 가능한 방</span>
	        <span class="count">${availableRooms.length}</span>
	      </div>
	  `;

    if (availableRooms.length === 0) {
        html += `<div class="text-muted" style="padding:10px; font-size:12px; color:var(--text-2);">입장 가능한 채팅방이 없습니다.</div>`;
    } else {
        availableRooms.forEach((room) => {
            const currentCount = room.currentMemberCount ?? 0;
            const maxCount = room.chatroomMaxMember ?? 0;

            // 정원 초과 여부 계산
            const isFull = currentCount >= maxCount;

            html += `
	        <div class="room-card">
	          <div class="room-info">
	            <span class="room-name">${room.chatroomTitle}</span>
	            <span class="room-meta room-meta-clickable" data-room-id="${room.chatroomId}" title="참여 중인 멤버 보기" style="cursor:pointer; text-decoration:underline dotted;">${currentCount} / ${maxCount}명</span>
	          </div>
	          <!-- isFull 상태에 따라 버튼 클래스, disabled 속성, 텍스트가 동적으로 바뀝니다 -->
	          <button type="button" class="btn ${isFull ? 'btn-secondary' : 'btn-primary'}"
	                  data-room-id="${room.chatroomId}"
	                  data-room-title="${room.chatroomTitle}"
	                  ${isFull ? 'disabled' : ''}>
	                  ${isFull ? '정원 초과' : '입장'}
	          </button>
	        </div>
	      `;
        });
    }

    html += `</section>`;

    // 4. 최종 동적 생성된 HTML 주입
    listContainer.innerHTML = html;

    // ★ #openNotifPanelBtn(🔔)이 매번 새로 만들어지는 요소라 뱃지도 같이 사라지므로,
    //   다시 그려질 때마다 현재 안읽음 개수로 뱃지를 다시 붙여준다.
    updateChatRoomNotifBadge();
}

// ==========================================================================
// 이벤트 및 탭 제어 로직
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // HTML 구조의 .panel-tabs button 및 data-tab-target 속성에 맞춰 클릭 이벤트 등록
    const tabButtons = document.querySelectorAll(".panel-tabs button");

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const targetTab = button.dataset.tabTarget;
            if (targetTab) {
                switchTab(targetTab);
            }
        });
    });
});

/**
 * 탭 및 패널 전환 함수
 * @param {string} tabName - 'list', 'chat', 'create'
 */
function switchTab(tabName) {
    // 탭 버튼 active 클래스 토글
    document.querySelectorAll(".panel-tabs button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tabTarget === tabName);
    });

    // 본문 패널 active 클래스 토글
    document.querySelectorAll(".panel-body").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
    });

    // ★ "채팅" 탭으로 전환되는 순간 - 패널을 닫았다 여는 것과 무관하게(예: "목록" 탭 보다가 다시 "채팅" 탭 클릭),
    //   안읽음 구분선이 있으면 그 위치로 스크롤하고, 지금부터 보고 있는 것이므로 읽음 처리한다.
    //   (기존에는 switchToChatroom()을 다시 거칠 때만 이 처리가 됐어서, 패널을 안 닫고 탭만 왔다갔다 하면
    //   구분선이 DOM에는 있어도 스크롤이 항상 맨 아래에 멈춰 있어 눈에 안 띄는 문제가 있었음)
    if (tabName === "chat" && currentChatroomId) {
        const messagesBox = document.getElementById("chatroomMessages");
        if (messagesBox) {
            requestAnimationFrame(() => scrollChatToUnreadOrBottom(messagesBox));
        }
        resetChatUnreadBadge();
        markChatroomViewedNow(currentChatroomId);
    }
}

/** 현재 렌더링된 마지막 메시지까지 "읽음"으로 확정 (DOM에서 직접 최신 메시지 id를 읽어와 저장) */
function markChatroomViewedNow(chatroomId) {
    const messagesBox = document.getElementById("chatroomMessages");
    if (!messagesBox) return;
    const msgEls = messagesBox.querySelectorAll("[data-message-id]");
    if (msgEls.length === 0) return;
    const latestId = Number(msgEls[msgEls.length - 1].dataset.messageId);
    if (!latestId) return;
    setLastReadMessageId(chatroomId, latestId);
    currentRoomLastReadId = latestId;
}

/**
 * 참여 중인 방 [대화하기] 클릭 시
 * ★ 더 이상 버튼의 onclick으로 직접 호출되지 않음 (렌더링 함수에서 인라인 onclick 제거함).
 *   기존 목업 단계에서 쓰이던 함수라 그대로 남겨두되, 실제 흐름은
 *   chatroomListContainer의 이벤트 위임 -> switchToChatroom() 이 담당함.
 */
function openChatRoom(roomId, roomTitle = "") {
    // 1. 채팅 탭으로 화면 전환
    switchTab("chat");

    // 2. 해당 방 데이터 로드 (예시 메시지 삽입)
    const messageArea = document.getElementById("chatMessages");
    if (messageArea) {
        messageArea.innerHTML = `
      <div class="chat-bubble">💬 <strong>[${roomTitle || roomId}]</strong> 방에 입장했습니다.</div>
      <div class="chat-bubble">자유롭게 대화를 나눠보세요.</div>
    `;
    }
}

/**
 * 신규 방 [입장] 클릭 시
 * ★ 더 이상 버튼의 onclick으로 직접 호출되지 않음 (렌더링 함수에서 인라인 onclick 제거함).
 *   기존 목업 단계에서 쓰이던 함수라 그대로 남겨두되, 실제 흐름은
 *   chatroomListContainer의 이벤트 위임 -> enterChatroom() 이 담당함.
 */
function joinChatRoom(roomId, roomTitle = "") {
    alert(`[${roomTitle || roomId}] 채팅방에 참여했습니다!`);

    // 입장 후 바로 해당 대화방으로 이동
    openChatRoom(roomId, roomTitle);
}


/**
 * 채팅방 목록을 서버(GET /api/chatroom)에서 받아옴
 */
async function loadChatroomList(autoEnterMyRoom = true) {
    try {
        const response = await fetch("/api/chatroom");
        if (!response.ok) return;
        const rooms = await response.json();

        // 1. 내가 참여 중인 방 찾기
        const myJoinedRoom = rooms.find(room => room.joined === true);
        const hasMyRoom = !!myJoinedRoom;

        // 2. '개설' 탭 버튼 요소 선택
        const createTabButton = document.querySelector("[data-tab-target='create']");

        if (createTabButton) {
            if (hasMyRoom) {
                // 이미 방에 소속되어 있다면 개설 탭 숨기기
                createTabButton.style.display = "none";
            } else {
                // 소속된 방이 없다면 개설 탭 다시 보여주기
                createTabButton.style.display = "inline-block";
            }
        }

        renderChatroomList(rooms);

        // 3. ★ 내가 이미 참여 중인 방이 존재하면, [대화하기]를 누르지 않아도 즉시 해당 채팅방으로 자동 연결!
        if (autoEnterMyRoom && myJoinedRoom) {
            switchToChatroom(myJoinedRoom.chatroomId, myJoinedRoom.chatroomTitle);
        }
    } catch (error) {
        console.error("채팅방 목록 로딩 실패:", error);
    }
}
// ==========================================================================
// ! 웹소켓(STOMP) 연결 및 실시간 채널 구독 관리 함수 
// ==========================================================================
function initChatroomSocket() {
    if (typeof SockJS === "undefined" || typeof Stomp === "undefined") {
        console.warn("SockJS/Stomp 라이브러리가 로드되지 않았습니다.");
        return null;
    }

    if (currentStompClient && currentStompClient.connected) {
        return currentStompClient;
    }

    const socket = new SockJS('/ws-connect');
    currentStompClient = Stomp.over(socket);
    currentStompClient.debug = null;

    currentStompClient.connect({}, () => {
        currentStompClient.subscribe('/sub/chatroom-list', (message) => {
            const rooms = JSON.parse(message.body);
            renderChatroomList(rooms);
        });

        // ★ 회원 개인 전용 알림 채널 구독 (경고 알림 및 3회 경고 시 즉시 강제퇴장 처리)
        const memberIdInput = document.getElementById("currentMemberId");
        const currentMemberId = memberIdInput ? Number(memberIdInput.value) : 0;
        if (currentMemberId > 0) {
            currentStompClient.subscribe(`/sub/member/${currentMemberId}/notice`, (message) => {
                const notice = JSON.parse(message.body);

                // 알림 도착 시 채팅 패널이 닫혀있으면 💬 뱃지 +1
                const chatPanel = document.getElementById("chatroomPanel");
                if (!chatPanel || !chatPanel.classList.contains("open")) {
                    incrementChatUnreadBadge();
                }

                if (notice.type === "WARNING") {
                    // ★ 개인 전용 채널로는 더 이상 🔔 알림을 추가하지 않음 - 채팅방 브로드캐스트 시스템 메시지(appendChatMessage)로만
                    //   모두에게 동일하게 보이는 알림 하나만 남긴다(중복 제거). 여기서는 즉시 안내 팝업만 띄움.
                    alert(`[경고 알림]\n${notice.message}`);
                } else if (notice.type === "KICKED") {
                    // ★ 강퇴도 마찬가지로 🔔 알림은 브로드캐스트 시스템 메시지에만 맡기고, 여기서는 팝업 + 강제 퇴장 처리만 수행
                    alert(`[강제퇴장 알림]\n${notice.message}`);
                    // 현재 해당 채팅방에 입장해 있다면 즉시 세션 해제 및 목록으로 이동
                    if (currentChatroomId && currentChatroomId == notice.chatroomId) {
                        if (currentChatroomSubscription) {
                            currentChatroomSubscription.unsubscribe();
                            currentChatroomSubscription = null;
                        }
                        currentChatroomId = null;
                        currentChatroomRole = null;
                        resetChatView();
                        const listTabButton = document.querySelector("[data-tab-target='list']");
                        if (listTabButton) listTabButton.click();
                        loadChatroomList(false);
                    }
                }
            });

            // ★ 헤더 🔔 알림 전용 채널 구독 (경고 부여 / 내 글 댓글 / QNA 답변완료 - 채팅방 알림과는 완전 별개)
            currentStompClient.subscribe(`/sub/member/${currentMemberId}/alert`, (message) => {
                const notif = JSON.parse(message.body);
                addNotification(getHeaderNotifIcon(notif.type), notif.message, notif.createdAt, notif.id);
            });
        }
    });

    return currentStompClient;
}
// ==========================================================================
// ! 웹소켓(STOMP) 연결 및 실시간 채널 구독 관리 수정 추가 !
// ==========================================================================


// 소켓 연결 및 특정 채팅방 구독 함수
function connectChatroom(chatroomId) {
    if (typeof SockJS === "undefined" || typeof Stomp === "undefined") {
        console.warn("SockJS/Stomp 라이브러리가 로드되지 않았습니다.");
        return null;
    }

    if (currentStompClient && currentStompClient.connected) {
        // 이미 연결되어 있다면 해당 방만 구독 추가
        subscribeChatroom(chatroomId);
        return currentStompClient;
    }

    const socket = new SockJS('/ws-connect');
    currentStompClient = Stomp.over(socket);
    currentStompClient.debug = null;

    currentStompClient.connect({}, () => {
        // 1. 전체 채팅방 목록 구독
        currentStompClient.subscribe('/sub/chatroom-list', (message) => {
            const rooms = JSON.parse(message.body);
            renderChatroomList(rooms);
        });

        // ★ 회원 개인 전용 알림 채널 구독 (경고 알림 및 3회 경고 시 즉시 강제퇴장 처리)
        const memberIdInput = document.getElementById("currentMemberId");
        const currentMemberId = memberIdInput ? Number(memberIdInput.value) : 0;
        if (currentMemberId > 0) {
            currentStompClient.subscribe(`/sub/member/${currentMemberId}/notice`, (message) => {
                const notice = JSON.parse(message.body);

                // 알림 도착 시 채팅 패널이 닫혀있으면 💬 뱃지 +1
                const chatPanel = document.getElementById("chatroomPanel");
                if (!chatPanel || !chatPanel.classList.contains("open")) {
                    incrementChatUnreadBadge();
                }

                if (notice.type === "WARNING") {
                    // ★ 개인 전용 채널로는 더 이상 🔔 알림을 추가하지 않음 - 채팅방 브로드캐스트 시스템 메시지(appendChatMessage)로만
                    //   모두에게 동일하게 보이는 알림 하나만 남긴다(중복 제거). 여기서는 즉시 안내 팝업만 띄움.
                    alert(`[경고 알림]\n${notice.message}`);
                } else if (notice.type === "KICKED") {
                    // ★ 강퇴도 마찬가지로 🔔 알림은 브로드캐스트 시스템 메시지에만 맡기고, 여기서는 팝업 + 강제 퇴장 처리만 수행
                    alert(`[강제퇴장 알림]\n${notice.message}`);
                    // 현재 해당 채팅방에 입장해 있다면 즉시 세션 해제 및 목록으로 이동
                    if (currentChatroomId && currentChatroomId == notice.chatroomId) {
                        if (currentChatroomSubscription) {
                            currentChatroomSubscription.unsubscribe();
                            currentChatroomSubscription = null;
                        }
                        currentChatroomId = null;
                        currentChatroomRole = null;
                        resetChatView();
                        const listTabButton = document.querySelector("[data-tab-target='list']");
                        if (listTabButton) listTabButton.click();
                        loadChatroomList(false);
                    }
                }
            });

            // ★ 헤더 🔔 알림 전용 채널 구독 (경고 부여 / 내 글 댓글 / QNA 답변완료 - 채팅방 알림과는 완전 별개)
            currentStompClient.subscribe(`/sub/member/${currentMemberId}/alert`, (message) => {
                const notif = JSON.parse(message.body);
                addNotification(getHeaderNotifIcon(notif.type), notif.message, notif.createdAt, notif.id);
            });
        }

        // 2. 현재 입장한 채팅방 메시지 구독
        if (chatroomId) {
            subscribeChatroom(chatroomId);
        }
    });

    return currentStompClient;
}

// 개별 방 구독 전용 함수
function subscribeChatroom(chatroomId) {
    if (!currentStompClient || !currentStompClient.connected) {
        console.warn("STOMP 연결이 준비되지 않았습니다.");
        return;
    }

    currentStompClient.subscribe(`/sub/chatroom/${chatroomId}`, (message) => {
        const chatMessage = JSON.parse(message.body);
        appendChatMessage(chatMessage);
    });
}

// ==========================================================================
// ! 화면에 실시간 채팅 말풍선 렌더링 함수 추가 !
// ==========================================================================
/** @param isHistoryReplay switchToChatroom()이 이전 대화 내역을 한꺼번에 다시 그릴 때 true.
 *  이때는 뱃지 증가/알림 재조회처럼 "새로 도착했을 때만" 필요한 부수효과를 건너뛴다. */
function appendChatMessage(msgDTO, isHistoryReplay = false) {
    const messagesBox = document.getElementById("chatroomMessages");
    if (!messagesBox) return;

    // ★ 0. 중복 메시지 렌더링 차단 (ID 기반 중복 검사)
    if (msgDTO.chatMessageId) {
        const existingMsg = messagesBox.querySelector(`[data-message-id="${msgDTO.chatMessageId}"]`);
        if (existingMsg) return;
    }

    const content = msgDTO.chatMessageContent || "";

    // ★ 시스템 메시지 여부 판단 (memberName이 SYSTEM이거나, 입/퇴장/강퇴/경고 안내 멘트인 경우)
    const isWarnMsg = content.includes("경고를 받았습니다") || content.includes("⚠️") || content.includes("강제퇴장");
    const isSystemMsg = msgDTO.memberName === "SYSTEM" ||
        !msgDTO.memberId ||
        content.includes("입장했습니다") ||
        content.includes("퇴장했습니다") ||
        isWarnMsg;

    // ★ 시스템 메시지 텍스트 중복 방지 (바로 직전 메시지와 텍스트가 일치하는 경우 중복 렌더링 방지)
    if (isSystemMsg && messagesBox.lastElementChild) {
        const lastText = messagesBox.lastElementChild.textContent || "";
        if (lastText.trim() === content.trim()) {
            return;
        }
    }

    // ★ 수정: 이름(memberName) 대신 회원 고유 ID(memberId)로 내 메시지인지 비교
    const memberIdInput = document.getElementById("currentMemberId");
    const currentMemberId = memberIdInput ? Number(memberIdInput.value) : 0;

    // 받아온 메시지의 작성자 ID와 내 ID가 같으면 'me' 클래스 추가 (우측 빨간색)
    const isMe = (msgDTO.memberId === currentMemberId);

    const msgDiv = document.createElement("div");
    if (msgDTO.chatMessageId) {
        msgDiv.dataset.messageId = msgDTO.chatMessageId;
    }

    if (isSystemMsg) {
        msgDiv.className = isWarnMsg ? "chat-msg system warning" : "chat-msg system";
        msgDiv.textContent = content;
    } else {
        msgDiv.className = isMe ? "chat-msg me" : "chat-msg";
        msgDiv.innerHTML = `
            <div class="avatar"></div>
            <div class="message-container">
                <div class="sender-name">${msgDTO.memberName}</div>
                <div class="bubble"></div>
            </div>
        `;
        msgDiv.querySelector(".bubble").textContent = content;

        // ★ 추가: 방장이면서 본인 메시지가 아니고, 메시지 ID가 있을 때만 경고 버튼 노출
        if (currentChatroomRole === "방장" && !isMe && msgDTO.chatMessageId) {
            const warnBtn = document.createElement("button");
            warnBtn.type = "button";
            warnBtn.className = "chat-warn-btn";
            warnBtn.textContent = "경고";
            warnBtn.addEventListener("click", () => giveWarningToMessage(msgDTO.chatMessageId));
            msgDiv.appendChild(warnBtn);
        }
    }

    // ★ "안 본 메시지부터 보기" - 저장된 마지막 읽음 위치보다 뒤에 있는 첫 메시지 앞에 구분선을 한 번만 삽입
    const isUnread = !isMe && currentRoomLastReadId !== null && msgDTO.chatMessageId > currentRoomLastReadId;
    if (isUnread && !messagesBox.querySelector(".chat-unread-divider")) {
        const divider = document.createElement("div");
        divider.className = "chat-unread-divider";
        divider.textContent = "여기부터 새로운 메시지입니다";
        messagesBox.appendChild(divider);
    }

    messagesBox.appendChild(msgDiv);

    if (isHistoryReplay) {
        return; // 히스토리 재생 중에는 아래 "새로 도착했을 때만" 필요한 부수효과를 건너뜀
    }

    // ★ 채팅방 전용 🔔 팝업은 입장/퇴장/경고/강퇴 시스템 메시지에만 반응 (일반 채팅 메시지는 알림 대상 아님)
    //   ChatroomService가 이미 notifications 테이블에 적재해 두었으므로, DB에서 다시 불러와 실제 id로 동기화한다.
    if (isSystemMsg) {
        loadChatRoomNotificationsFromServer();
        refreshChatroomMembersBar(); // 입장/퇴장/강퇴로 참여자 구성이 바뀌었을 수 있으므로 실시간 참여자 바도 갱신
    } else if (!isMe) {
        if (isChatViewActive()) {
            // 지금 그 채팅방을 실제로 보고 있는 중이면 바로 읽음 위치 갱신 (안읽음 뱃지/구분선 대상 아님)
            if (currentChatroomId && msgDTO.chatMessageId) {
                setLastReadMessageId(currentChatroomId, msgDTO.chatMessageId);
                currentRoomLastReadId = msgDTO.chatMessageId;
            }
        } else {
            // 일반 채팅 메시지는 🔔 알림 없이 💬 채팅 아이콘 뱃지만 갱신
            incrementChatUnreadBadge();
        }
    }

    // 스크롤 맨 아래로 (실시간으로 도착한 메시지는 바로 따라가서 보여줌)
    scrollToBottom(messagesBox);
}

// ==========================================================================
// ! 특정 채팅방 진입 및 이전 대화 히스토리 비동기 로드 함수 추가 !
// ==========================================================================
/** 히스토리를 다 그린 뒤, 안읽음 구분선이 있으면 그 위치로, 없으면 맨 아래로 스크롤 */
function scrollChatToUnreadOrBottom(messagesBox) {
    if (!messagesBox) return;
    const divider = messagesBox.querySelector(".chat-unread-divider");
    if (divider) {
        divider.scrollIntoView({ block: "center" });
    } else {
        scrollToBottom(messagesBox);
    }
}

async function switchToChatroom(chatroomId, chatroomTitle) {
    if (!chatroomId) return;

    currentChatroomId = chatroomId;
    // ★ 안 본 메시지부터 보기 - 이 방을 마지막으로 읽은 위치를 불러옴 (한 번도 안 봤으면 null)
    //   ※ 이 값은 "실제로 패널을 열어서 본" 시점에만 최신으로 갱신한다 (아래 isChatViewActive() 분기 참고).
    //     loadChatroomList(true)가 페이지 로드마다 조용히(패널이 닫힌 채로) 자동 재접속하면서 이 함수를
    //     호출하기 때문에, 여기서 바로 갱신해버리면 새로고침만 해도 "다 읽음" 처리가 되어버린다.
    const readIdBeforeThisView = getLastReadMessageId(chatroomId);
    currentRoomLastReadId = readIdBeforeThisView;
    const memberIdInput = document.getElementById("currentMemberId");
    const myMemberId = memberIdInput ? Number(memberIdInput.value) : 0;

    const titleEl = document.getElementById("chatroomTitleText");
    if (titleEl && chatroomTitle) {
        titleEl.textContent = `💬 ${chatroomTitle}`;
    }

    const messagesBox = document.getElementById("chatroomMessages");
    if (messagesBox) {
        messagesBox.innerHTML = "";
    }

    // ★ 실시간 참여자 목록 바 로드 (클릭 없이 항상 표시)
    refreshChatroomMembersBar();

    // ★ 추가: 내 역할(방장/참여자) 조회 — 메시지 렌더링 시 경고 버튼 노출 여부 판단에 사용
    try {
        const roleRes = await fetch(`/api/chatroom/${chatroomId}/role`);
        if (roleRes.ok) {
            const roleData = await roleRes.json();
            currentChatroomRole = roleData.role || null;
        } else {
            currentChatroomRole = null;
        }
    } catch (error) {
        console.error("역할 조회 실패:", error);
        currentChatroomRole = null;
    }

    let latestMessageIdInRoom = null;
    try {
        const response = await fetch(`/api/chatroom/${chatroomId}/messages`);
        if (response.ok) {
            const messageList = await response.json();
            messageList.forEach(msg => appendChatMessage(msg, true));
            requestAnimationFrame(() => scrollChatToUnreadOrBottom(messagesBox));

            if (messageList.length > 0) {
                latestMessageIdInRoom = messageList[messageList.length - 1].chatMessageId;
            }

            // ★ 새로고침해도 실제 안읽은 메시지 수가 유지되도록, 저장된 마지막 읽음 위치 기준으로
            //   다시 계산해서 헤더 💬 뱃지에 반영한다 (unreadChatCount는 페이지 로드마다 0으로 초기화되는
            //   메모리 변수라 그것만으로는 새로고침 후 안읽음 개수를 알 수 없음)
            unreadChatCount = readIdBeforeThisView !== null
                ? messageList.filter(m => m.memberId !== myMemberId && m.chatMessageId > readIdBeforeThisView).length
                : 0;
            updateChatUnreadBadge();
        }
    } catch (error) {
        console.error("채팅 메시지 내역 로드 실패:", error);
    }

    const stompClient = initChatroomSocket();

    const subscribeToRoom = () => {
        if (currentChatroomSubscription) {
            currentChatroomSubscription.unsubscribe();
        }

        currentChatroomSubscription = stompClient.subscribe(`/sub/chatroom/${chatroomId}`, (message) => {
            const chatMessageDTO = JSON.parse(message.body);
            appendChatMessage(chatMessageDTO);
        });
    };

    if (stompClient && stompClient.connected) {
        subscribeToRoom();
    } else {
        const checkConnection = setInterval(() => {
            if (stompClient && stompClient.connected) {
                clearInterval(checkConnection);
                subscribeToRoom();
            }
        }, 100);
    }

    const chatTab = document.querySelector('[data-tab-target="chat"]');
    if (chatTab) {
        chatTab.click();
        requestAnimationFrame(() => scrollChatToUnreadOrBottom(messagesBox));
    }

    // ★ 채팅 패널이 실제로 열려서 지금 보고 있는 상태일 때만 "여기까지 읽음"으로 확정한다
    //   (loadChatroomList(true)의 페이지 로드 시 조용한 자동 재접속에서는 패널이 닫혀있으므로 건드리지 않음 -
    //    그래야 새로고침만으로 안읽음이 사라지지 않고, 다음에 진짜로 열었을 때 정확히 반영됨)
    if (isChatViewActive()) {
        resetChatUnreadBadge();
        if (latestMessageIdInRoom !== null) {
            setLastReadMessageId(chatroomId, latestMessageIdInRoom);
            currentRoomLastReadId = latestMessageIdInRoom;
        }
    }
}
// ==========================================================================
// ! 채팅방 입장 비동기 처리 함수
// ==========================================================================
let isEnteringChatroom = false;

async function enterChatroom(chatroomId, chatroomTitle) {
    if (isEnteringChatroom) return;

    if (!chatroomId) {
        console.error("채팅방 ID가 없습니다.");
        return;
    }

    isEnteringChatroom = true;
    let isNewJoin = false;

    try {
        const response = await fetch(`/api/chatroom/${chatroomId}/enter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                const errorText = await response.text();
                alert(errorText || "채팅방 입장 처리에 실패했습니다.");
                return;
            }

            // ★ 409 Conflict (이미 참여 중인 방이 있는 경우 또는 강퇴/정원초과) 처리
            if (response.status === 409) {
                // 강퇴당한 채팅방인 경우 — 메시지만 표시하고 종료
                const errMsg = errorData.message || (typeof errorData === 'string' ? errorData : '');
                if (errMsg.includes('강퇴')) {
                    alert(errMsg);
                    return;
                }

                const roomName = errorData.existingRoomTitle || "기존 방";
                const existingRoomId = errorData.existingRoomId || null;
                alert(`회원당 한 곳의 채팅방만 이용 가능합니다.\n이미 참여 중인 채팅방 [${roomName}]으로 이동합니다.`);

                if (existingRoomId && existingRoomId > 0) {
                    loadChatroomList();
                    switchToChatroom(existingRoomId, roomName);
                }
                return;
            }

            alert(errorData.message || "채팅방 입장 처리에 실패했습니다.");
            return;
        }

        const data = await response.json();
        isNewJoin = data.isNew;
    } catch (error) {
        console.error("서버 통신 에러:", error);
        alert("강제 퇴장으로 채팅방에 입장 할 수 없습니다.");
        return;
    } finally {
        isEnteringChatroom = false;
    }

    loadChatroomList();
    switchToChatroom(chatroomId, chatroomTitle);

    if (isNewJoin) {
        alert(`[${chatroomTitle}] 채팅방에 참여했습니다!`);
    }
}
/** 방을 나가거나 강제삭제하는 등 본인이 직접 마무리지은 액션 직후 - 그로 인해 방금 새로 쌓인
 *  채팅방 알림(예: "강제 삭제했습니다")까지 본인 것은 안읽음으로 남지 않도록 정리 */
function clearChatUnreadAfterOwnAction() {
    resetChatUnreadBadge();
    fetch("/api/chatroom/notifications/read", { method: "POST" })
        .then(() => loadChatRoomNotificationsFromServer())
        .catch(err => console.error("채팅방 알림 읽음 처리 실패:", err));
}

// ==========================================================================
// ! 채팅방 나가기 비동기 처리 함수
// ==========================================================================
async function leaveChatroom() {
    if (!currentChatroomId) {
        alert("입장한 채팅방이 없습니다.");
        return;
    }
    if (!confirm("채팅방에서 나가시겠습니까?")) return;

    try {
        const response = await fetch(`/api/chatroom/${currentChatroomId}/leave`, {
            method: 'POST'
        });
        if (!response.ok) {
            const errorText = await response.text();
            alert(errorText || "나가기에 실패했습니다.");
            return;
        }
    } catch (error) {
        console.error("나가기 요청 실패:", error);
        alert("서버 연결에 실패했습니다. 네트워크 상태를 확인하세요.");
        return;
    }

    if (currentChatroomSubscription) {
        currentChatroomSubscription.unsubscribe();
        currentChatroomSubscription = null;
    }

    currentChatroomId = null;
    currentChatroomRole = null;   // ★ 추가: 방을 나가면 역할 정보도 초기화

    // ★ 기존 코드(titleEl, messages 직접 변경) 대신 resetChatView() 호출로 변경
    resetChatView();
    clearChatUnreadAfterOwnAction();

    const listTabButton = document.querySelector("[data-tab-target='list']");
    if (listTabButton) listTabButton.click();

    loadChatroomList(false);
}

// ==========================================================================
// ! 채팅방 강제삭제(운영자 전용) 비동기 처리 함수
// ==========================================================================
async function forceDeleteChatroom() {
    if (!currentChatroomId) {
        alert("선택된 채팅방이 없습니다.");
        return;
    }
    if (!confirm("이 채팅방을 강제로 삭제하시겠습니까?\n방에 있는 모든 참여자가 나가게 됩니다.")) return;

    try {
        const response = await fetch(`/api/chatroom/${currentChatroomId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorText = await response.text();
            alert(errorText || "채팅방 강제삭제에 실패했습니다.");
            return;
        }
    } catch (error) {
        console.error("채팅방 강제삭제 요청 실패:", error);
        alert("서버 연결에 실패했습니다. 네트워크 상태를 확인하세요.");
        return;
    }

    if (currentChatroomSubscription) {
        currentChatroomSubscription.unsubscribe();
        currentChatroomSubscription = null;
    }

    currentChatroomId = null;
    currentChatroomRole = null;

    resetChatView();
    clearChatUnreadAfterOwnAction();

    const listTabButton = document.querySelector("[data-tab-target='list']");
    if (listTabButton) listTabButton.click();

    loadChatroomList(false);
}

// ==========================================================================
//  ! 실시간 메시지 전송 및 입력 처리 함수
// ==========================================================================
function initChatroomChat() {
    const input = document.getElementById("chat_message_content");
    const sendBtn = document.getElementById("chatroomSendBtn");

    if (input && sendBtn) {
        // 기존 initChatroomChat() 내부의 send 함수를 아래와 같이 수정합니다.
        const send = () => {
            console.log("send()호출");

            // ★ 1. 방 선택 안 됨 / 입장한 방 없음 검증 추가
            const titleEl = document.getElementById('chatroomTitleText');
            const messagesEl = document.getElementById('chatroomMessages');
            const currentInput = document.getElementById("chat_message_content");

            const isNoRoomSelected =
                !currentChatroomId ||
                !titleEl ||
                titleEl.innerText.includes("방 선택 없음") ||
                (messagesEl && messagesEl.querySelector('.chat-empty-state'));

            if (isNoRoomSelected) {
                alert("입장한 채팅방이 존재하지 않습니다.");
                if (currentInput) currentInput.value = ""; // 입력값 초기화
                return; // 소켓 전송 안 하고 종료
            }

            // ★ 2. 입력값 유효성 검사
            const text = currentInput ? currentInput.value.trim() : "";
            if (!text) return;

            // ★ 3. 소켓 전송 (기존 로직)
            if (currentStompClient && currentStompClient.connected) {
                const myId = Number(document.getElementById("currentMemberId")?.value || 1);
                const myName = document.getElementById("currentMemberName")?.value || "익명";

                currentStompClient.send("/pub/chat/message", {}, JSON.stringify({
                    chatroomId: Number(currentChatroomId),
                    memberId: myId,
                    memberName: myName,
                    chatMessageContent: text
                }));
                console.log("--- 메시지 전송됨 ---", text);
            } else {
                console.warn("소켓이 연결되어 있지 않습니다.");
            }

            currentInput.value = "";

        };

        // 클릭 시 폼 제출(새로고침) 기본 동작 방지 추가
        sendBtn.addEventListener("click", (e) => {
            console.log("전송 버튼 클릭!");
            e.preventDefault();
            send();
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault(); // 엔터키 기본 동작 방지
                send();
            }
        });

    }



    initChatroomSocket();

    // ★ 헤더 🔔 알림 패널 / 채팅방 🔔 알림 패널 최초 로드 (로그인 상태일 때만) - 새로고침/재접속해도 DB에서 그대로 불러옴
    const initMemberIdInput = document.getElementById("currentMemberId");
    const initMemberId = initMemberIdInput ? Number(initMemberIdInput.value) : 0;
    if (initMemberId > 0) {
        loadNotificationsFromServer();
        loadChatRoomNotificationsFromServer();
        // ★ 내가 참여 중인 방이 있으면 패널을 열지 않은 상태에서도 조용히 재접속해서
        //   (1) 실시간 메시지 구독을 살려두고 (2) 그동안 쌓인 안읽은 메시지 수를 헤더 💬 뱃지에 반영한다.
        //   switchToChatroom()의 isChatViewActive() 분기 덕분에 패널이 닫혀있는 동안은 읽음 처리되지 않는다.
        loadChatroomList(true);
    }

    const chatroomTrigger = document.getElementById("chatroomTrigger");
    if (chatroomTrigger) {
        chatroomTrigger.addEventListener("click", () => {
            resetChatUnreadBadge();
            loadChatroomList(true);
        });
    }

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

    // ★ 채팅방 전용 🔔 알림 슬라이드 패널: 닫기 / 전체 삭제 버튼
    const chatRoomNotifClose = document.getElementById("chatRoomNotifClose");
    if (chatRoomNotifClose) {
        chatRoomNotifClose.addEventListener("click", closeChatRoomNotifPanel);
    }
    const chatRoomNotifClearBtn = document.getElementById("chatRoomNotifClearBtn");
    if (chatRoomNotifClearBtn) {
        chatRoomNotifClearBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            chatRoomNotifList = [];
            updateChatRoomNotifBadge();
            renderChatRoomNotifList();
            fetch("/api/chatroom/notifications", { method: "DELETE" }).catch(err => console.error("채팅방 알림 전체 삭제 실패:", err));
        });
    }
    // ★ 채팅방 알림 개별 삭제(✕) 버튼: 목록이 매번 다시 그려지므로 위임 방식으로 처리
    const chatRoomNotifListEl = document.getElementById("chatRoomNotifList");
    if (chatRoomNotifListEl) {
        chatRoomNotifListEl.addEventListener("click", (e) => {
            const delBtn = e.target.closest(".notification-delete");
            if (!delBtn) return;
            e.stopPropagation();
            removeChatRoomNotif(Number(delBtn.dataset.notifId));
        });
    }
    // 채팅방 패널이 닫히면 옆에 나란히 떠있던 채팅방 알림 패널도 같이 닫음
    ["chatroomClose", "chatroomBackdrop"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", closeChatRoomNotifPanel);
    });

    const chatroomListContainer = document.getElementById("chatroomListContainer");
    if (chatroomListContainer) {
        chatroomListContainer.addEventListener("click", (e) => {
            // 🔔 알림 버튼 클릭 → 채팅방 전용 알림 슬라이드 패널 토글 (헤더 알림 패널과 별개)
            if (e.target.closest("#openNotifPanelBtn")) {
                toggleChatRoomNotifPanel();
                return;
            }

            // ★ "N / M명" 클릭 → 방에 들어가지 않고도 그 방의 참여 중인 멤버 목록 미리보기
            const metaEl = e.target.closest(".room-meta-clickable");
            if (metaEl) {
                e.stopPropagation();
                openRoomMembersPeekModal(metaEl.dataset.roomId, metaEl);
                return;
            }

            const btn = e.target.closest("button[data-room-id]");
            if (!btn) return;
            const chatroomId = btn.dataset.roomId;
            const chatroomTitle = btn.dataset.roomTitle;
            const alreadyJoined = btn.dataset.joined === "true";

            if (alreadyJoined) {
                switchToChatroom(chatroomId, chatroomTitle);
            } else {
                enterChatroom(chatroomId, chatroomTitle);
            }
        });
    }

    // 채팅방 개설 비동기 처리
    const roomNameInput = document.getElementById("chatroom_title");
    const maxUserInput = document.getElementById("chatroom_max_member");
    const createBtn = document.getElementById("chatroomCreateBtn");
	if (roomNameInput && maxUserInput && createBtn) {
	        createBtn.addEventListener("click", async () => {
	            const name = roomNameInput.value.trim();
	            const maxUsers = Number(maxUserInput.value);

	            if (!name) {
	                alert("방 이름을 입력해주세요.");
	                return;
	            }
	            if (!maxUsers || maxUsers < 2 || maxUsers > 30) {
	                alert("최대 인원은 2명 이상, 30명 이하로 입력해주세요.");
	                return;
	            }

	            try {
	                const response = await fetch('/api/chatroom', {
	                    method: 'POST',
	                    headers: { 'Content-Type': 'application/json' },
	                    body: JSON.stringify({ chatroomTitle: name, chatroomMaxMember: maxUsers })
	                });

	                if (response.ok) {
	                    // 서버에서 보내준 생성된 채팅방 ID(숫자)를 안전하게 받습니다.
	                    const chatroomId = await response.json();

	                    // 입력창 초기화
	                    roomNameInput.value = "";
	                    maxUserInput.value = "10";

	                    // 1. 목록 갱신 (개설 탭이 사라지고 목록에 방이 반영됨)
	                    loadChatroomList();

	                    // 2. 개설하자마자 곧바로 해당 채팅방으로 입장 처리!
	                    if (typeof enterChatroom === "function") {
	                        enterChatroom(chatroomId, name);
	                    } else {
	                        // 만약 입장 함수가 따로 없다면 목록 탭으로 강제 이동
	                        const listTabButton = document.querySelector("[data-tab-target='list']");
	                        if (listTabButton) listTabButton.click();
	                    }

	                } else {
	                    const errorMsg = await response.text();
	                    alert(errorMsg || "채팅방 개설에 실패했습니다.");
	                }
	            } catch (error) {
	                console.error("비동기 통신 중 에러:", error);
	                alert("서버 연결에 실패했습니다. 네트워크 상태를 확인하세요.");
	            }
	        }); // ← addEventListener를 닫는 괄호
	    } // ← if문을 닫는 괄호
	} // ← 이 전체를 감싸고 있던 상위 함수/블록을 닫는 괄호 (필요에 따라 확인)

/**
 * 실시간 참여자 목록 바 갱신 - 클릭 없이 항상 표시되며(방장 상단 고정),
 * 방에 들어갈 때 + 입장/퇴장/강퇴가 일어날 때마다 다시 불러온다.
 */
async function refreshChatroomMembersBar() {
    if (!currentChatroomId) return;

    const listEl = document.getElementById("chatroomMembersList");
    const titleEl = document.getElementById("membersModalTitle");
    if (!listEl) return;

    try {
        const response = await fetch(`/api/chatroom/${currentChatroomId}/members`);
        if (!response.ok) return;
        const members = await response.json();

        if (titleEl) {
            titleEl.textContent = `👥 실시간 참여자 (${members.length}명)`;
        }

        listEl.innerHTML = "";
        members.forEach(m => {
            const isOwner = m.chatMemberRole === "방장";
            const li = document.createElement("li");
            li.className = isOwner ? "members-modal-item owner" : "members-modal-item";

            li.innerHTML = `
                <span class="member-name-text">
                    👤 ${m.memberName}
                </span>
                ${isOwner ? '<span class="owner-badge">방장</span>' : '<span style="color:var(--text-2); font-size:11px;">참여자</span>'}
            `;
            listEl.appendChild(li);
        });
    } catch (error) {
        console.error("참여자 목록 로딩 실패:", error);
    }
}

/**
 * ★ 추가: 채팅방 "목록" 탭에서 방에 들어가지 않고도 참여 중인 멤버를 미리 볼 수 있는 팝업
 * - #chatroomMembersModal은 "채팅" 탭 안에 중첩되어 있어 "목록" 탭에서는 화면에 보이지 않으므로,
 *   body에 직접 붙는 별도의 모달을 하나 더 둔다 (탭 전환과 무관하게 항상 위에 뜸).
 */
function ensureRoomMembersPeekModal() {
    let modal = document.getElementById("roomMembersPeekModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "roomMembersPeekModal";
    modal.className = "room-members-peek-modal";
    modal.innerHTML = `
        <div class="members-modal-header">
            <span id="roomMembersPeekTitle">👥 참여 중인 멤버</span>
            <button type="button" class="members-close-btn" id="roomMembersPeekCloseBtn">&times;</button>
        </div>
        <ul class="members-modal-list" id="roomMembersPeekList"></ul>
    `;
    document.body.appendChild(modal);

    modal.querySelector("#roomMembersPeekCloseBtn").addEventListener("click", () => {
        modal.classList.remove("open");
    });
    // 모달 및 "N / M명" 텍스트 바깥을 클릭하면 닫기
    document.addEventListener("click", (e) => {
        if (!modal.classList.contains("open")) return;
        if (modal.contains(e.target) || e.target.closest(".room-meta-clickable")) return;
        modal.classList.remove("open");
    });

    return modal;
}

/** 클릭한 "N / M명" 텍스트 바로 아래에 모달이 뜨도록 위치 계산 */
function positionRoomMembersPeekModal(modal, anchorEl) {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const modalWidth = 280;
    const margin = 16;
    const left = Math.min(rect.left, window.innerWidth - modalWidth - margin);
    modal.style.top = `${rect.bottom + 6}px`;
    modal.style.left = `${Math.max(margin, left)}px`;
}

/** 특정 채팅방(참여 여부 무관)의 참여 중인 멤버 목록을 조회해 클릭한 위치 바로 아래에 팝업으로 보여줌 */
async function openRoomMembersPeekModal(chatroomId, anchorEl) {
    if (!chatroomId) return;
    const modal = ensureRoomMembersPeekModal();
    const listEl = modal.querySelector("#roomMembersPeekList");
    const titleEl = modal.querySelector("#roomMembersPeekTitle");
    positionRoomMembersPeekModal(modal, anchorEl);

    try {
        const response = await fetch(`/api/chatroom/${chatroomId}/members`);
        if (!response.ok) return;
        const members = await response.json();

        if (titleEl) {
            titleEl.textContent = `👥 참여 중인 멤버 (${members.length}명)`;
        }

        listEl.innerHTML = "";
        if (members.length === 0) {
            listEl.innerHTML = `<li class="members-modal-item" style="justify-content:center; color:var(--text-2);">참여 중인 멤버가 없습니다.</li>`;
        } else {
            members.forEach(m => {
                const isOwner = m.chatMemberRole === "방장";
                const li = document.createElement("li");
                li.className = isOwner ? "members-modal-item owner" : "members-modal-item";
                li.innerHTML = `
                    <span class="member-name-text">👤 ${m.memberName}</span>
                    ${isOwner ? '<span class="owner-badge">방장</span>' : '<span style="color:var(--text-2); font-size:11px;">참여자</span>'}
                `;
                listEl.appendChild(li);
            });
        }

        modal.classList.add("open");
    } catch (error) {
        console.error("참여 멤버 목록 로딩 실패:", error);
    }
}

/**==================================================================================
 * 채팅방 상단 케밥(⋮) 메뉴 & 방 나가기 제어 함수
 * (참여자 목록은 더 이상 클릭으로 여닫는 팝업이 아니라 항상 표시되는 고정 바 - refreshChatroomMembersBar 참고)
 ===================================================================================*/

// 1. 케밥 메뉴 & 방 나가기 & 외부 클릭 통합 감지
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('chatroomDropdown');

    // ① 케밥 버튼(⋮) 클릭 시 드롭다운 토글
    const menuBtn = e.target.closest('#chatroomMenuBtn');
    if (menuBtn) {
        e.stopPropagation();
        if (dropdown) {
            dropdown.classList.toggle('open');
        }
        return;
    }

    // ② 채팅방 나가기 버튼 클릭 시
    const leaveBtn = e.target.closest('#chatroomLeaveBtn');
    if (leaveBtn) {
        if (dropdown) dropdown.classList.remove('open');
        if (typeof leaveChatroom === 'function') {
            leaveChatroom(); // 채팅방 나가기 기존 함수 실행
        }
        return;
    }

    // ③ 채팅방 강제삭제 버튼(운영자 전용) 클릭 시
    const forceDeleteBtn = e.target.closest('#chatroomForceDeleteBtn');
    if (forceDeleteBtn) {
        if (dropdown) dropdown.classList.remove('open');
        forceDeleteChatroom();
        return;
    }

    // ④ 드롭다운 바깥 영역 클릭 시 닫기
    if (dropdown && dropdown.classList.contains('open')) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    }
});

// 2. 채팅방 나가기 또는 초기화 시 뷰 리셋 함수
function resetChatView() {
    const titleEl = document.getElementById('chatroomTitleText');
    const messagesEl = document.getElementById('chatroomMessages');
    const dropdownEl = document.getElementById('chatroomDropdown');
    const membersListEl = document.getElementById('chatroomMembersList');
    const membersTitleEl = document.getElementById('membersModalTitle');

    // 상단 방 제목 초기화
    if (titleEl) {
        titleEl.innerText = "💬 방 선택 없음";
    }

    // 메시지 영역 중앙 안내 문구 표시
    if (messagesEl) {
        messagesEl.innerHTML = '<div class="chat-empty-state">선택하신 채팅방이 존재하지 않습니다.</div>';
    }

    // 열려있던 드롭다운 닫기
    if (dropdownEl) {
        dropdownEl.classList.remove('open');
    }

    // 참여자 목록 바도 비워서 초기 상태로
    if (membersTitleEl) {
        membersTitleEl.textContent = "👥 실시간 참여자";
    }
    if (membersListEl) {
        membersListEl.innerHTML = "";
    }
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

// ---- 취향/장르 선택 칩 (클릭 시 선택 표시 토글) ----
/*function initGenreChips() {
    document.querySelectorAll(".genre-chip").forEach((chip) => {
        if (chip.closest("#genreGrid")) return;
        chip.addEventListener("click", () => chip.classList.toggle("selected"));
    });
}*/

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
    const isSinglePageList = pathname.split("/").pop() === "04_list.html";
    const isReviewList = pathname.endsWith("/review/list");
    const current = isSinglePageList
        ? new URLSearchParams(location.search).get("cat") || "all"
        : isReviewList
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

    initChatroomChat();
    /*initChatroomMenu()*/;   // 케밥 메뉴 및 나가기 기능 초기화
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