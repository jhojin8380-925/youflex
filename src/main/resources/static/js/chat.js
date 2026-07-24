// ==========================================================================
// 채팅방 관련 기능 (app.js에서 분리)
// - 채팅방 목록/입장/전송/나가기, 실시간 소켓(STOMP), 채팅방 전용 알림 패널,
//   참여자 목록, 케밥 메뉴(나가기/강제삭제) 등 채팅방 도메인 전용 코드
// - formatNotifTime/formatNotifDate/getHeaderNotifIcon/addNotification 등
//   헤더 🔔 알림 관련 전역 함수는 app.js에 그대로 있고, 여기서는 그 함수들을 호출만 함
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

/** 채팅방 전용 🔔 알림 종류별 아이콘 매핑 (입장/퇴장/경고/강퇴 - ChatroomService.resolveChatNotifType과 매칭) */
function getChatNotifIcon(type) {
    if (type === "입장") return "🚪";
    if (type === "퇴장") return "👋";
    if (type === "경고") return "⚠️";
    if (type === "강퇴") return "🚫";
    return "💬";
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
            } else {
                console.warn("소켓이 연결되어 있지 않습니다.");
            }

            currentInput.value = "";

        };

        // 클릭 시 폼 제출(새로고침) 기본 동작 방지 추가
        sendBtn.addEventListener("click", (e) => {
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
