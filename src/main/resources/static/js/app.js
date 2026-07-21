// ==========================================================================
// OTT 리뷰 웹사이트 - 화면 초안 공통 인터랙션 (와이어프레임 목업용)
// ==========================================================================



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

// ---- 방장(평론가) 퇴장 시 채팅방 삭제 경고 (확인창 -> 확인 누르면 삭제 알림) ----
function confirmRoomLeave() {
    const ok = confirm(
        "방장이 퇴장하면 채팅방이 삭제되고 대화 내용이 모두 사라집니다.\n정말 퇴장하시겠습니까?"
    );
    if (ok) {
        alert("채팅방이 삭제되었습니다. (데모)");
    }
}

// ---- 채팅방: 방장(평론가/관리자)이 채팅 내에서 특정 사용자에게 경고를 부여 ----
function giveChatWarning() {
    const name = prompt("경고를 부여할 사용자의 닉네임을 입력하세요.");
    if (!name || !name.trim()) return; // 취소하거나 빈 값이면 무시
    const messages = document.getElementById("chatroomMessages");
    if (!messages) return;
    // 채팅창에 시스템 메시지 형태로 경고 알림을 추가
    const msg = document.createElement("div");
    msg.className = "chat-msg system warning";
    msg.textContent = `⚠ ${name.trim()}님 경고 1회`;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight; // 스크롤을 맨 아래로 이동
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
 * 즉, 페이지가 "최초 로드"될 때 Thymeleaf(th:each)가 그려주는 입장 버튼과는
 * 완전히 별개로, 이 함수가 목록 영역(#chatroomListContainer)의 내용을
 * innerHTML로 통째로 교체하면서 "입장" 버튼도 새로 만든다.
 */
function renderChatroomList(rooms) {
    const listContainer = document.getElementById("chatroomListContainer");
    if (!listContainer) return; // 채팅방 목록 영역이 없는 페이지면 종료

    // 기존에 그려져 있던 목록을 전부 비운다 (재렌더링을 위한 초기화)
    listContainer.innerHTML = "";

    // 서버에서 받아온 방 목록이 없으면 "개설된 채팅방이 없습니다" 안내만 표시
    if (!rooms || rooms.length === 0) {
        listContainer.innerHTML = `<div class="text-muted" style="padding:16px;text-align:center">개설된 채팅방이 없습니다.</div>`;
        return;
    }

    // 방 목록 배열을 순회하며 방 하나당 room-list-item 한 줄씩 생성
    rooms.forEach((room) => {
        const item = document.createElement("div");
        item.className = "room-list-item";

        // 방 이름 / 인원수 / 입장 버튼을 문자열 템플릿으로 한번에 삽입
        // ★ data-room-id 뿐 아니라 data-room-title도 함께 심어둠
        //   -> 나중에 입장 버튼을 눌렀을 때 방 제목을 채팅창 상단에 그대로 반영하기 위함.
        item.innerHTML = `
      <div>
        <div class="room-name">${room.chatroomTitle}</div>
        <div class="room-count">${room.currentMemberCount ?? 0} / ${room.chatroomMaxMember}명</div>
      </div>
      <button class="btn btn-primary btn-sm"
              data-room-id="${room.chatroomId}"
              data-room-title="${room.chatroomTitle}">입장</button>
    `;

        listContainer.appendChild(item);
    });
}

/**
 * 채팅방 목록을 서버(GET /api/chatroom)에서 최초 1회 받아와 화면에 그린다.
 * STOMP(웹소켓)는 "이미 발생한 과거 이벤트"를 새로 들어온 사람에게 재전송해주지 않으므로,
 * 패널을 열 때마다(=채팅 아이콘 클릭 시) 최신 스냅샷을 fetch로 한 번 받아와야 한다.
 */
async function loadChatroomList() {
    try {
        const response = await fetch('/api/chatroom');
        if (!response.ok) return;
        const rooms = await response.json();
        renderChatroomList(rooms); // 받아온 목록으로 화면을 다시 그림 (입장 버튼도 여기서 새로 생성)
    } catch (error) {
        console.error("채팅방 목록 로딩 실패:", error);
    }
}

/**
 * 웹소켓(STOMP) 연결 및 실시간 채팅방 목록 구독.
 * WebSocketConfig 설정 기준: 접속 엔드포인트 "/ws-connect", 구독 prefix "/sub"
 */
function initChatroomSocket() {
    if (typeof SockJS === "undefined" || typeof Stomp === "undefined") {
        console.warn("SockJS/Stomp 라이브러리가 로드되지 않았습니다. app.js보다 먼저 스크립트를 불러오세요.");
        return null;
    }

    const socket = new SockJS('/ws-connect');
    const stompClient = Stomp.over(socket);
    stompClient.debug = null; // 콘솔 로그 끄기

    stompClient.connect({}, () => {
        stompClient.subscribe('/sub/chatroom-list', (message) => {
            const rooms = JSON.parse(message.body);
            renderChatroomList(rooms);
        });
    });

    return stompClient;
}

/**
 * 채팅방 패널의 [채팅] 탭 기능(메시지 입력/전송)과 [개설] 탭 기능(방 만들기)을 초기화하고,
 * 페이지 진입 시 웹소켓 구독을 미리 시작
 */
function initChatroomChat() {
    const messages = document.getElementById("chatroomMessages");
    const input = document.getElementById("chat_message_content");
    const sendBtn = document.getElementById("chatroomSendBtn");

    if (messages && input && sendBtn) {
        // 메시지 전송 처리 (현재는 데모용 - 서버 연동 없이 화면에만 말풍선 추가)
        const send = () => {
            const text = input.value.trim();
            if (!text) return;
            const msg = document.createElement("div");
            msg.className = "chat-msg me";
            msg.innerHTML = '<div class="avatar"></div><div class="bubble"></div>';
            msg.querySelector(".bubble").textContent = text;
            messages.appendChild(msg);
            input.value = "";
            messages.scrollTop = messages.scrollHeight;

            // 0.9초 뒤 상대방이 답장하는 것처럼 보이는 데모용 자동 응답
            setTimeout(() => {
                const reply = document.createElement("div");
                reply.className = "chat-msg";
                reply.innerHTML = '<div class="avatar"></div><div class="bubble"></div>';
                reply.querySelector(".bubble").textContent = "ㅋㅋㅋ 저도 그렇게 생각해요";
                messages.appendChild(reply);
                messages.scrollTop = messages.scrollHeight;
            }, 900);
        };
        sendBtn.addEventListener("click", send);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") send();
        });
    }

    // 웹소켓 연결 시작: 페이지 진입 시 미리 구독해둠
    initChatroomSocket();

    // 채팅방 패널(아이콘)을 열 때마다 최신 목록을 서버에서 받아와 채움
    const chatroomTrigger = document.getElementById("chatroomTrigger");
    if (chatroomTrigger) {
        chatroomTrigger.addEventListener("click", loadChatroomList);
    }

    // ------------------------------------------------------------
    // ★★★ 입장 버튼 이벤트 위임(delegation) 등록 ★★★
    // ------------------------------------------------------------
    const chatroomListContainer = document.getElementById("chatroomListContainer");
    if (chatroomListContainer) {
        chatroomListContainer.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-room-id]");
            if (!btn) return; // 입장 버튼이 아닌 다른 곳을 클릭한 경우 무시

            const chatroomId = btn.dataset.roomId;       
            const chatroomTitle = btn.dataset.roomTitle;  

            enterChatroom(chatroomId, chatroomTitle);
        });
    }

    // ---- [개설] 탭: 새 채팅방 만들기 비동기 처리 ----
    const roomNameInput = document.getElementById("chatroom_title");
    const maxUserInput = document.getElementById("chatroom_max_member");
    const createBtn = document.getElementById("chatroomCreateBtn");

    if (roomNameInput && maxUserInput && createBtn) {
        createBtn.addEventListener("click", async () => {
            const name = roomNameInput.value.trim();
            const maxUsers = Number(maxUserInput.value);

            // 입력값 검증
            if (!name) {
                alert("방 이름을 입력해주세요.");
                return;
            }
            if (!maxUsers || maxUsers < 2) {
                alert("최대 인원은 2명 이상으로 입력해주세요.");
                return;
            }
            // 최대 인원 30명 초과 검증 
            if (maxUsers > 30) {
                alert("최대 인원은 30명을 초과할 수 없습니다.");
                return;
            }

            // 서버로 보낼 요청 바디
            const requestData = {
                chatroomTitle: name,
                chatroomMaxMember: maxUsers
            };

            try {
                const response = await fetch('/api/chatroom', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData)
                });

                if (response.ok) {
                    const chatroomId = await response.json();
                    console.log("생성된 채팅방 ID:", chatroomId);

                    // 입력 필드 초기화
                    roomNameInput.value = "";
                    maxUserInput.value = "10";

                    // 자동으로 [목록] 탭으로 이동
                    const listTabButton = document.querySelector("[data-tab-target='list']");
                    if (listTabButton) {
                        listTabButton.click();
                    }

                } else {
                    // 서버가 던진 실제 에러 메시지(예: 충돌 시 409 등)를 그대로 표시
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

/**
 * ★★★ 채팅방 "입장" 버튼을 눌렀을 때 실제로 실행되는 통합 함수 ★★★
 * - 1. 백엔드 서버로 POST 요청을 보내 DB(chat_member)에 입장 정보 저장
 * - 2. 채팅 탭으로 화면 전환 및 상단 타이틀 변경
 * - 3. 화면 채팅창에 'OO님이 입장했습니다' 시스템 메시지 추가
 */
async function enterChatroom(chatroomId, chatroomTitle) {
    if (!chatroomId) {
        console.error("채팅방 ID가 없습니다.");
        return;
    }

    // 1. 서버로 입장 요청 전송 (실제 DB chat_member 테이블에 INSERT)
    try {
        const response = await fetch(`/api/chatroom/${chatroomId}/enter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            alert(errorText || "채팅방 입장 처리에 실패했습니다.");
            return;
        }
    } catch (error) {
        console.error("서버 통신 에러:", error);
        alert("서버 연결에 실패했습니다. 네트워크 상태를 확인하세요.");
        return;
    }

    // 2. 채팅방 패널 안의 [채팅] 탭 버튼을 찾아 자동으로 클릭(화면 전환)
    const chatTab = document.querySelector('[data-tab-target="chat"]');
    if (chatTab) {
        chatTab.click();
    }

    // 3. 입장한 방의 제목을 채팅창 상단에 반영
    const titleEl = document.getElementById("chatroomTitleText");
    if (titleEl && chatroomTitle) {
        titleEl.textContent = `💬 ${chatroomTitle}`;
    }

    // 4. 로그인한 회원 이름을 가져와서 채팅창에 입장 시스템 메시지 표시
    const memberNameInput = document.getElementById("currentMemberName");
    const loginMemberName = memberNameInput && memberNameInput.value.trim() !== "" ? memberNameInput.value : "회원";

    const messages = document.getElementById("chatroomMessages");
    if (messages) {
        const joinMsg = document.createElement("div");
        joinMsg.className = "chat-msg system";
        joinMsg.textContent = `‘${loginMemberName}’님이 입장했습니다`;
        messages.appendChild(joinMsg);
        messages.scrollTop = messages.scrollHeight;
    }

    console.log("성공적으로 입장한 채팅방 ID:", chatroomId, "/ 제목:", chatroomTitle);
}
// 케밥 메뉴 열기/닫기
const chatroomMenuBtn = document.getElementById('chatroomMenuBtn');
const chatroomDropdown = document.getElementById('chatroomDropdown');
if (chatroomMenuBtn && chatroomDropdown) {
  chatroomMenuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    chatroomDropdown.classList.toggle('open');
  });
  // 메뉴 바깥 클릭 시 닫기
  document.addEventListener('click', function (e) {
    if (!chatroomDropdown.contains(e.target) && e.target !== chatroomMenuBtn) {
      chatroomDropdown.classList.remove('open');
    }
  });
  // 메뉴 안 토글 스위치 클릭 시엔 메뉴가 안 닫히도록
  chatroomDropdown.querySelector('.toggle-item').addEventListener('click', function (e) {
    e.stopPropagation();
  });
}

// 알림 켜기/끄기
const chatroomNotifyToggle = document.getElementById('chatroomNotifyToggle');
if (chatroomNotifyToggle) {
  chatroomNotifyToggle.addEventListener('change', function () {
    const isOn = this.checked;
    fetch('/chatroom/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifyOn: isOn })
    }).catch(err => console.error('알림 설정 저장 실패:', err));
  });
}

// 채팅방 나가기 버튼
const chatroomLeaveBtn = document.getElementById('chatroomLeaveBtn');
if (chatroomLeaveBtn) {
  chatroomLeaveBtn.addEventListener('click', function () {
    if (chatroomDropdown) chatroomDropdown.classList.remove('open');
    if (!confirm('채팅방에서 나가시겠습니까?')) return;

    // 입장 시 저장해둔 현재 방 ID 사용 (예: chatroomPanel.dataset.currentRoomId)
    const roomId = document.getElementById('chatroomPanel').dataset.currentRoomId;

    fetch(`/chatroom/${roomId}/leave`, { method: 'POST' })
      .then(res => {
        if (res.ok) {
          alert('채팅방에서 나갔습니다.');
          document.querySelector('[data-tab-target="list"]').click(); // 목록 탭으로 이동
        } else {
          alert('나가기에 실패했습니다.');
        }
      })
      .catch(err => console.error('나가기 요청 실패:', err));
  });
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

    const isListPage = location.pathname.split("/").pop() === "04_list.html";
    const current = isListPage
        ? new URLSearchParams(location.search).get("cat") || "all"
        : document.body.dataset.navCurrent || "";

    nav.querySelectorAll("a[data-nav]").forEach((a) => {
        a.classList.toggle("active", a.dataset.nav === current);
    });
}

// ==========================================================================
// DOM 로드 완료 후, 위에서 정의한 모든 초기화 함수를 순서대로 실행
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    initDropdowns();
    initHeroSlider();
    initCategoryNav();

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
document.getElementById("footerTopBtn").addEventListener("click", function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
});