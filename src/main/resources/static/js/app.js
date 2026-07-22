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


// ! STOMP 클라이언트 및 개별 방 구독 객체 전역 관리 변수 추가 !
let currentStompClient = null;
let currentChatroomSubscription = null;


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
function giveChatWarning() {
    const titleEl = document.getElementById('chatroomTitleText');
    const messages = document.getElementById("chatroomMessages");

    // ★ 1. 선택된 방이 없는지 체크 (방 미선택 상태 차단)
    const isNoRoomSelected =
        !titleEl ||
        titleEl.innerText.includes("방 선택 없음") ||
        (messages && messages.querySelector('.chat-empty-state'));

    if (isNoRoomSelected) {
        alert("개설된 채팅방이 없습니다.");
        return; // 이하 로직 실행 중단
    }

    if (!messages) return;

    // ★ 2. 방이 있을 때만 경고 부여 진행
    const name = prompt("경고를 부여할 사용자의 닉네임을 입력하세요.");
    if (!name || !name.trim()) return; // 취소하거나 빈 값이면 무시

    // 채팅창에 시스템 메시지 형태로 경고 알림을 추가
    const msg = document.createElement("div");
    msg.className = "chat-msg system warning";
    msg.textContent = `⚠ ${name.trim()}님 경고 1회`;
    messages.appendChild(msg);

    // 스크롤을 맨 아래로 이동
    if (typeof scrollToBottom === 'function') {
        scrollToBottom(messages);
    } else {
        messages.scrollTop = messages.scrollHeight;
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
/*
==================  서버에서 받은 채팅방 목록(rooms)을 화면에 그려주는(렌더링하는) 로직  ===================
*/
function renderChatroomList(rooms) {
    // 채팅방 목록을 표시할 영역 찾기
    const listContainer = document.getElementById("chatroomListContainer");
    if (!listContainer) return;

    // 1. 기존 목록 초기화
    listContainer.innerHTML = "";

    // 2. 방 목록이 아예 없을 때 예외 처리
    if (!rooms || rooms.length === 0) {
        listContainer.innerHTML = `<div class="text-muted" style="padding:24px 16px; text-align:center; font-size:13px;">개설된 채팅방이 없습니다.</div>`;
        return;
    }

    // 3. 참여 여부(room.joined)에 따라 두 그룹으로 분류
    const joinedRooms = rooms.filter((room) => room.joined === true);
    const availableRooms = rooms.filter((room) => room.joined !== true);

    let html = "";

    // -------------------------------------------------------------------------
    // [섹션 1] 내가 참여 중인 방
    // -------------------------------------------------------------------------
    html += `
    <section class="room-section">
      <div class="section-title">
        <span>내가 참여 중인 방</span>
        <span class="count">${joinedRooms.length}</span>
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
	        <span class="room-meta">${currentCount} / ${maxCount}명</span>
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

            html += `
        <div class="room-card">
          <div class="room-info">
            <span class="room-name">${room.chatroomTitle}</span>
            <span class="room-meta">${currentCount} / ${maxCount}명</span>
          </div>
          <button type="button" class="btn btn-primary"
                  data-room-id="${room.chatroomId}"
                  data-room-title="${room.chatroomTitle}">입장</button>
        </div>
      `;
        });
    }
    html += `</section>`;

    // 4. 최종 동적 생성된 HTML 주입
    listContainer.innerHTML = html;
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
async function loadChatroomList() {
    try {
        const response = await fetch("/api/chatroom");
        if (!response.ok) return;
        const rooms = await response.json();
        renderChatroomList(rooms);
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

        // 2. 현재 입장한 채팅방 메시지 구독
        if (chatroomId) {
            subscribeChatroom(chatroomId);
        }
    });

    return currentStompClient;
}

// 개별 방 구독 전용 함수
function subscribeChatroom(chatroomId) {
    // 중복 구독을 방지하려면 기존 구독 객체를 관리하는 처리가 필요할 수 있습니다.
    currentStompClient.subscribe(`/sub/chatroom/${chatroomId}`, (message) => {
        const chatMessage = JSON.parse(message.body);
        // 화면에 메시지를 그려주는 함수 호출 (예: appendMessageToUI)
        appendMessageToUI(chatMessage);
    });
}

// ==========================================================================
// ! 화면에 실시간 채팅 말풍선 렌더링 함수 추가 !
// ==========================================================================
function appendChatMessage(msgDTO) {
    const messagesBox = document.getElementById("chatroomMessages");
    if (!messagesBox) return;

    // ★ 수정: 이름(memberName) 대신 회원 고유 ID(memberId)로 내 메시지인지 비교
    const memberIdInput = document.getElementById("currentMemberId");
    const currentMemberId = memberIdInput ? Number(memberIdInput.value) : 0;

    // 받아온 메시지의 작성자 ID와 내 ID가 같으면 'me' 클래스 추가 (우측 빨간색)
    const isMe = (msgDTO.memberId === currentMemberId);

    const msgDiv = document.createElement("div");
    msgDiv.className = isMe ? "chat-msg me" : "chat-msg";

    if (msgDTO.memberName === "SYSTEM" || !msgDTO.memberId) {
        msgDiv.className = "chat-msg system";
        msgDiv.textContent = msgDTO.chatMessageContent;
    } else {
        msgDiv.innerHTML = `
            <div class="avatar"></div>
            <div class="message-container">
                <div class="sender-name">${msgDTO.memberName}</div>
                <div class="bubble"></div>
            </div>
        `;
        msgDiv.querySelector(".bubble").textContent = msgDTO.chatMessageContent;
    }

    messagesBox.appendChild(msgDiv);

    // 스크롤 맨 아래로 (앞의 ! 제거)
    scrollToBottom(messagesBox);
}

// ==========================================================================
// ! 특정 채팅방 진입 및 이전 대화 히스토리 비동기 로드 함수 추가 !
// ==========================================================================
async function switchToChatroom(chatroomId, chatroomTitle) {
    if (!chatroomId) return;

    currentChatroomId = chatroomId;

    const titleEl = document.getElementById("chatroomTitleText");
    if (titleEl && chatroomTitle) {
        titleEl.textContent = `💬 ${chatroomTitle}`;
    }

    const messagesBox = document.getElementById("chatroomMessages");
    if (messagesBox) {
        messagesBox.innerHTML = "";
    }

    try {
        const response = await fetch(`/api/chatroom/${chatroomId}/messages`);
        if (response.ok) {
            const messageList = await response.json();
            messageList.forEach(msg => appendChatMessage(msg));
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
			// ★ 409 Conflict (이미 참여 중인 방이 있는 경우) 처리
			if (response.status === 409) {
			    const roomName = errorData.existingRoomTitle || "기존 방";
			    alert(`회원당 한 곳의 채팅방만 이용 가능합니다.\n이미 참여 중인 채팅방 [${roomName}]으로 이동합니다.`);
			    
			    if (errorData.existingRoomId && errorData.existingRoomId > 0) {   // ★ activeChatroomId → existingRoomId 로 수정
			        loadChatroomList();
			        switchToChatroom(errorData.existingRoomId, roomName);          // ★ 여기도 동일하게 수정
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
        alert("서버 연결에 실패했습니다. 네트워크 상태를 확인하세요.");
        return;
    } finally {
        isEnteringChatroom = false;
    }

    loadChatroomList();
   await switchToChatroom(chatroomId, chatroomTitle);

    if (isNewJoin) {
        alert(`[${chatroomTitle}] 채팅방에 참여했습니다!`);

        const memberNameInput = document.getElementById("currentMemberName");
        const loginMemberName = memberNameInput && memberNameInput.value.trim() !== "" ? memberNameInput.value : "회원";

        const messages = document.getElementById("chatroomMessages");
        if (messages) {
            const joinMsg = document.createElement("div");
            joinMsg.className = "chat-msg system";
            joinMsg.textContent = `'${loginMemberName}'님이 입장했습니다`;
            messages.appendChild(joinMsg);
            scrollToBottom(messages);
        }
    }
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

    // ★ 기존 코드(titleEl, messages 직접 변경) 대신 resetChatView() 호출로 변경
    resetChatView();

    const listTabButton = document.querySelector("[data-tab-target='list']");
    if (listTabButton) listTabButton.click();

    loadChatroomList();
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

    const chatroomTrigger = document.getElementById("chatroomTrigger");
    if (chatroomTrigger) {
        chatroomTrigger.addEventListener("click", loadChatroomList);
    }

    const chatroomListContainer = document.getElementById("chatroomListContainer");
    if (chatroomListContainer) {
        chatroomListContainer.addEventListener("click", (e) => {
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
                    roomNameInput.value = "";
                    maxUserInput.value = "10";
                    const listTabButton = document.querySelector("[data-tab-target='list']");
                    if (listTabButton) listTabButton.click();
                    loadChatroomList();
                } else {
                    const errorMsg = await response.text();
                    alert(errorMsg || "채팅방 개설에 실패했습니다.");
                }
            } catch (error) {
                console.error("비동기 통신 중 에러:", error);
                alert("서버 연결에 실패했습니다. 네트워크 상태를 확인하세요.");
            }
        });
    }
}

/**==================================================================================
 * 채팅방 상단 케밥(⋮) 메뉴 제어 함수 (경고 부여 & 방 나가기)
 ===================================================================================*/
/**==================================================================================
 * 채팅방 케밥(⋮) 메뉴 및 뷰 제어 스크립트
 * - 이벤트 위임 방식을 사용하여 동적 HTML 로딩/탭 전환 시에도 100% 정상 작동
 ===================================================================================*/

// 1. 케밥 메뉴 클릭 & 방 나가기 & 외부 클릭 통합 감지 (이벤트 위임)
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

    // ③ 드롭다운 메뉴 바깥 영역 클릭 시 메뉴 닫기
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
}
// ---- 취향/장르 선택 칩 (클릭 시 선택 표시 토글) ----
function initGenreChips() {
    document.querySelectorAll(".genre-chip").forEach((chip) => {
        if (chip.closest("#genreGrid")) return;
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