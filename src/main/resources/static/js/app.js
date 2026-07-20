// ==========================================================================
// OTT 리뷰 웹사이트 - 화면 초안 공통 인터랙션 (와이어프레임 목업용)
// ==========================================================================



// ==========================================================================
// 오버레이 패널 공통 함수 (챗봇 / 채팅방 / 알림 패널이 모두 이 함수를 재사용함)
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
// 챗봇 퀴즈: DB에서 객관식 1문제 + OX 1문제를 뽑아 출제, 하루 3번 제한
// ==========================================================================
const QNA_QUIZ_DAILY_LIMIT = 3; // 하루 최대 도전 횟수

// 문제 은행 (실제 서비스에서는 DB에서 랜덤 조회하도록 교체 예정)
const QNA_QUIZ_QUESTION_BANK = {
    mc: [
        { question: '「오징어게임」은 어느 플랫폼의 오리지널 시리즈일까요?', options: ['디즈니플러스', '넷플릭스', '티빙', '웨이브'], answerIndex: 1 },
        { question: '다음 중 국내 OTT 플랫폼이 아닌 것은?', options: ['티빙', '웨이브', '쿠팡플레이', 'HBO'], answerIndex: 3 },
        { question: '「무빙」은 어느 플랫폼에서 방영되었을까요?', options: ['디즈니플러스', '넷플릭스', '티빙', '왓챠'], answerIndex: 0 },
    ],
    ox: [
        { question: '티빙(TVING)은 CJ ENM이 운영하는 국내 OTT 서비스이다.', answer: true },
        { question: '디즈니플러스는 국내 오리지널 콘텐츠를 전혀 제작하지 않는다.', answer: false },
        { question: '넷플릭스는 광고 요금제를 제공한 적이 없다.', answer: false },
    ],
};

// 오늘 날짜를 "YYYY-MM-DD" 문자열로 반환 (localStorage에 날짜별로 횟수를 저장하기 위함)
function qnaQuizTodayKey() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// 오늘 남은 퀴즈 횟수를 반환. 날짜가 바뀌었으면 자동으로 초기화(리셋)한다.
function qnaQuizAttemptsLeft() {
    const today = qnaQuizTodayKey();
    if (localStorage.getItem('qnaQuizDate') !== today) {
        // 저장된 날짜와 오늘 날짜가 다르면(=날이 바뀌었으면) 횟수를 다시 3으로 채움
        localStorage.setItem('qnaQuizDate', today);
        localStorage.setItem('qnaQuizAttemptsLeft', String(QNA_QUIZ_DAILY_LIMIT));
    }
    return Number(localStorage.getItem('qnaQuizAttemptsLeft') || QNA_QUIZ_DAILY_LIMIT);
}

// 퀴즈 1회 사용 처리 (남은 횟수를 1 차감하고 저장)
function qnaQuizUseAttempt() {
    const left = Math.max(0, qnaQuizAttemptsLeft() - 1);
    localStorage.setItem('qnaQuizAttemptsLeft', String(left));
    return left;
}

// 배열에서 랜덤으로 하나 뽑기
function qnaQuizPickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// 챗봇 패널 안의 퀴즈 UI 초기화 (문제 출제 -> 정답 체크 -> 결과 표시 흐름 전체)
function initQnaChatbotQuiz() {
    const startBtn = document.getElementById('qnaQuizStartBtn');
    const countLabel = document.getElementById('qnaQuizCount');
    const playBox = document.getElementById('qnaQuizPlay');
    const progressLabel = document.getElementById('qnaQuizProgress');
    const questionLabel = document.getElementById('qnaQuizQuestion');
    const optionsBox = document.getElementById('qnaQuizOptions');
    const nextBtn = document.getElementById('qnaQuizNextBtn');
    const resultBox = document.getElementById('qnaQuizResult');
    if (!startBtn) return; // 챗봇 퀴즈 UI가 없는 페이지면 종료

    let questions = [];   // 이번 판에 출제된 문제 2개 (객관식 1 + OX 1)
    let step = 0;          // 현재 몇 번째 문제인지 (0 또는 1)
    let correctCount = 0;  // 맞춘 개수

    // 남은 횟수 UI 갱신 + 버튼 활성/비활성 처리
    function renderCount() {
        const left = qnaQuizAttemptsLeft();
        countLabel.textContent = `🎯 오늘 남은 퀴즈 횟수: ${left}/${QNA_QUIZ_DAILY_LIMIT}`;
        startBtn.disabled = left <= 0;
        startBtn.textContent = left <= 0 ? '오늘 퀴즈를 모두 사용했어요' : '퀴즈 시작';
    }

    // 현재 step에 해당하는 문제를 화면에 그림
    function renderQuestion() {
        const q = questions[step];
        progressLabel.textContent = `문제 ${step + 1}/${questions.length} · ${q.type === 'mc' ? '객관식' : 'OX'}`;
        questionLabel.textContent = q.question;
        optionsBox.innerHTML = '';
        nextBtn.style.display = 'none';

        // 객관식이면 options 배열 그대로, OX면 O/X 2개짜리 선택지로 변환
        const choices = q.type === 'mc'
            ? q.options.map((label, i) => ({ label, correct: i === q.answerIndex }))
            : [{ label: 'O', correct: q.answer === true }, { label: 'X', correct: q.answer === false }];

        // 선택지 버튼들을 동적으로 생성
        choices.forEach((choice) => {
            const btn = document.createElement('button');
            btn.textContent = choice.label;
            btn.dataset.correct = String(choice.correct);
            btn.addEventListener('click', () => {
                // 정답 선택 후에는 모든 선택지를 비활성화(중복 클릭 방지)
                Array.from(optionsBox.children).forEach((b) => (b.disabled = true));
                if (choice.correct) {
                    btn.classList.add('correct');
                    correctCount += 1;
                } else {
                    btn.classList.add('wrong');
                    // 오답을 골랐을 경우 정답도 함께 하이라이트 해줌
                    const correctBtn = Array.from(optionsBox.children).find((b) => b.dataset.correct === 'true');
                    if (correctBtn) correctBtn.classList.add('correct');
                }
                // 다음 문제가 남아있으면 "다음 문제" 버튼 노출, 없으면 바로 결과 표시
                if (step < questions.length - 1) {
                    nextBtn.style.display = 'inline-block';
                } else {
                    finishQuiz();
                }
            });
            optionsBox.appendChild(btn);
        });
    }

    // 퀴즈 종료 처리: 횟수 차감 + 결과 문구 표시
    function finishQuiz() {
        const left = qnaQuizUseAttempt();
        playBox.style.display = 'none';
        resultBox.style.display = 'block';
        resultBox.textContent = `✅ 2문제 중 ${correctCount}문제를 맞히셨어요! (오늘 남은 횟수 ${left}/${QNA_QUIZ_DAILY_LIMIT})`;
        renderCount();
    }

    // [퀴즈 시작] 버튼 클릭 -> 문제 은행에서 객관식 1 + OX 1을 랜덤으로 뽑아 시작
    startBtn.addEventListener('click', () => {
        if (qnaQuizAttemptsLeft() <= 0) return; // 남은 횟수 없으면 무시
        questions = [
            Object.assign({ type: 'mc' }, qnaQuizPickRandom(QNA_QUIZ_QUESTION_BANK.mc)),
            Object.assign({ type: 'ox' }, qnaQuizPickRandom(QNA_QUIZ_QUESTION_BANK.ox)),
        ];
        step = 0;
        correctCount = 0;
        resultBox.style.display = 'none';
        playBox.style.display = 'block';
        renderQuestion();
    });

    // [다음 문제] 버튼 클릭 -> step 증가시키고 다음 문제 렌더링
    nextBtn.addEventListener('click', () => {
        step += 1;
        renderQuestion();
    });

    renderCount(); // 페이지 로드 시 최초 1회 남은 횟수 표시
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

// ---- 퀴즈 인터랙션 (챗봇 패널의 정적 HTML 예시용 - qna 퀴즈와는 별개의 구버전 로직) ----
function initQuiz() {
    document.querySelectorAll(".quiz-options button").forEach((btn) => {
        btn.addEventListener("click", () => {
            const options = btn.parentElement.querySelectorAll("button");
            const isCorrect = btn.dataset.correct === "true";
            options.forEach((o) => (o.disabled = true));
            btn.classList.add(isCorrect ? "correct" : "wrong");
            if (!isCorrect) {
                const correctBtn = Array.from(options).find((o) => o.dataset.correct === "true");
                correctBtn && correctBtn.classList.add("correct");
            }
        });
    });
}

// ---- 퀴즈 시작 버튼 (챗봇 패널의 정적 HTML 예시용 - 위 initQuiz와 짝) ----
function initQuizStart() {
    const startBtn = document.getElementById("quizStartBtn");
    const options = document.getElementById("quizOptions");
    if (!startBtn || !options) return;
    startBtn.addEventListener("click", () => {
        options.style.display = "grid";
        startBtn.disabled = true;
    });
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
 *
 * 여기서 핵심은 마지막에 있는 addEventListener 부분
 * innerHTML로 버튼을 새로 만들면 onclick 속성이 없기 때문에,
 * (Thymeleaf가 그린 최초 버튼과 달리) 아무 동작도 하지 않는 "빈 버튼"이 된다.
 * 그래서 반드시 JS로 클릭 이벤트를 직접 붙여줘야 함
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

        // ------------------------------------------------------------
        // ★ 입장 버튼 클릭 처리는 여기서 개별로 걸지 않음
        //   대신 initChatroomChat()에서 목록 컨테이너(#chatroomListContainer)
        //   하나에만 클릭 이벤트를 "위임(delegation)"으로 등록해두었으므로,
        //   버튼이 새로 그려질 때마다 매번 이벤트를 재등록할 필요가 없다.
        //   (Thymeleaf 최초 렌더링 버튼이든, 여기서 새로 만든 버튼이든 동일하게 동작)
        // ------------------------------------------------------------
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
 *
 * 누군가 방을 새로 개설하거나 삭제하면, 서버가 "/sub/chatroom-list" 로
 * 최신 방 목록 전체를 모든 접속자에게 브로드캐스트한다.
 * 이 콜백이 그 메시지를 받아 renderChatroomList()를 다시 호출 -> 목록이 실시간으로 갱신
 * (이때도 입장 버튼은 renderChatroomList 안에서 매번 새로 생성 + 이벤트 등록됨)
 */
function initChatroomSocket() {
    if (typeof SockJS === "undefined" || typeof Stomp === "undefined") {
        console.warn("SockJS/Stomp 라이브러리가 로드되지 않았습니다. app.js보다 먼저 스크립트를 불러오세요.");
        return null;
    }

    const socket = new SockJS('/ws-connect');
    const stompClient = Stomp.over(socket);
    stompClient.debug = null; // 콘솔 로그 끄기 (디버깅 시 이 줄 삭제)

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

    // ---- ★ 웹소켓 연결 시작: 페이지 진입 시 미리 구독해둠 (패널을 열기 전부터 실시간 갱신 대기) ----
    initChatroomSocket();

    // ---- ★ 채팅방 패널(아이콘)을 열 때마다 최신 목록을 서버에서 받아와 채움 ----
    // 이 리스너가 바로 "패널을 열 때 입장 버튼이 다시 그려지는" 트리거
    const chatroomTrigger = document.getElementById("chatroomTrigger");
    if (chatroomTrigger) {
        chatroomTrigger.addEventListener("click", loadChatroomList);
    }

    // ------------------------------------------------------------
    // ★★★ 입장 버튼 이벤트 위임(delegation) 등록 ★★★
    // ------------------------------------------------------------
    // 목록 컨테이너(#chatroomListContainer) 자체는 페이지 로드 시 한 번만 생성되고
    // 절대 통째로 사라지지 않으므로, 여기 딱 한 번만 클릭 리스너를 걸어두면 됨
    //
    // 동작 원리:
    //   1) 컨테이너 내부 "어디를 클릭하든" 이 리스너가 먼저 이벤트를 받는다(버블링).
    //   2) e.target(실제로 클릭된 요소)에서 가장 가까운
    //      <button data-room-id="..."> 를 찾는다 (closest 사용).
    //   3) 그런 버튼이 없으면(빈 영역 클릭 등) 그냥 무시.
    //   4) 있으면 그 버튼의 dataset(data-room-id, data-room-title)을 읽어
    //      enterChatroom()에 그대로 전달
    //
    // 장점: renderChatroomList()가 목록을 몇 번을 다시 그리든(fetch 갱신, 웹소켓 갱신)
    //       매번 개별 버튼에 이벤트를 다시 붙일 필요가 없음. 컨테이너 하나면 충분
    const chatroomListContainer = document.getElementById("chatroomListContainer");
    if (chatroomListContainer) {
        chatroomListContainer.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-room-id]");
            if (!btn) return; // 입장 버튼이 아닌 다른 곳을 클릭한 경우 무시

            const chatroomId = btn.dataset.roomId;       // data-room-id 값
            const chatroomTitle = btn.dataset.roomTitle;  // data-room-title 값

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

                    // ★ 참고: 프론트에서 직접 DOM을 조립하거나 fetch로 목록을 재조회할 필요 없음.
                    //         서버가 방 개설 성공 시 웹소켓(/sub/chatroom-list)으로 최신 목록을
                    //         모든 접속자에게 브로드캐스트하므로, 위에서 구독해둔 콜백이
                    //         자동으로 renderChatroomList를 호출해 화면(입장 버튼 포함)을 갱신

                    // 입력 필드 초기화
                    roomNameInput.value = "";
                    maxUserInput.value = "10";

                    // 자동으로 [목록] 탭으로 이동
                    const listTabButton = document.querySelector("[data-tab-target='list']");
                    if (listTabButton) {
                        listTabButton.click();
                    }

                } else {
                    // 서버가 던진 실제 에러 메시지(예: "이미 개설한 채팅방이 있습니다...")를 그대로 표시
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
 * ★★★ 채팅방 "입장" 버튼을 눌렀을 때 실제로 실행되는 함수 ★★★
 *
 * 호출 경로: initChatroomChat() 안에 등록된 이벤트 위임 리스너가
 *           클릭된 버튼의 data-room-id / data-room-title 값을 읽어서
 *           이 함수를 enterChatroom(chatroomId, chatroomTitle) 형태로 호출
 *
 * @param {number|string} [chatroomId]    - 입장한 채팅방의 고유 id
 * @param {string}        [chatroomTitle] - 입장한 채팅방의 이름 (제목 표시에 사용)
 */
function enterChatroom(chatroomId, chatroomTitle) {
    // 1단계: 채팅방 패널 안의 [채팅] 탭 버튼을 찾음
    //        (이 버튼이 DOM에 없으면 = 채팅방 패널 자체가 이 페이지에 없다는 뜻)
    const chatTab = document.querySelector('[data-tab-target="chat"]');

    if (chatTab) {
        // 2단계: [채팅] 탭 버튼을 "코드로" 클릭
        //        실제 사용자가 탭을 클릭한 것과 동일하게 동작하여,
        //        initTabs()에 이미 등록되어 있는 클릭 이벤트 리스너가 그대로 실행
        //        그 결과: [목록] 탭은 숨겨지고 [채팅] 탭 내용이 화면에 나타남
        chatTab.click();
    } else {
        // 채팅 탭 버튼을 못 찾은 경우 -> 콘솔에 에러를 남겨서 원인 파악을 돕는다.
        console.error("채팅 탭 버튼을 찾을 수 없습니다.");
        return;
    }

    // ------------------------------------------------------------
    // ★ 3단계: 입장한 방의 제목을 채팅창 상단(#chatroomTitleText)에 반영
    // ------------------------------------------------------------
    // common.html의 <span id="chatroomTitleText">가 기본적으로
    // "💬 오늘 개봉작 실시간 토크"라는 고정 텍스트를 갖고 있는데,
    // 여기서 실제로 입장한 방 이름으로 덮어써준다.
    const titleEl = document.getElementById("chatroomTitleText");
    if (titleEl && chatroomTitle) {
        titleEl.textContent = `💬 ${chatroomTitle}`;
    }

    // 4단계(확장 지점): chatroomId가 있다면 그 방에 대한 실제 입장 처리를 이어간다.
    //        예) 서버에 "해당 방 메시지 내역 조회" API 호출,
    //            STOMP로 "/sub/chatroom/{chatroomId}" 구독 등.
    //        지금은 데모 단계라 콘솔 로그만 남겨둔 상태.
    if (chatroomId) {
        console.log("입장한 채팅방 ID:", chatroomId, "/ 제목:", chatroomTitle);
        // TODO: 실제 방별 메시지 연동 시 여기서 STOMP 구독 예시
        // stompClient.subscribe(`/sub/chatroom/${chatroomId}`, (message) => {
        //     const chatMsg = JSON.parse(message.body);
        //     // chatroomMessages 영역에 메시지 렌더링...
        // });
    }
}

// ---- 취향/장르 선택 칩 (클릭 시 선택 표시 토글) ----
function initGenreChips() {
    document.querySelectorAll(".genre-chip").forEach((chip) => {
        // #genreGrid 안의 칩은 별도 로직(다른 곳)에서 처리되므로 여기서는 건너뜀
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
            e.stopPropagation(); // 아래 document 클릭 리스너로 이벤트가 번져서 바로 닫히는 것을 방지
            menu.classList.toggle("open");
        });
    });
    // 드롭다운 바깥 아무 곳이나 클릭하면 열려있는 모든 드롭다운을 닫음
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

    const AUTO_PLAY_MS = 3000; // 3초마다 자동 전환
    let index = 0;
    let timerId = null;

    // index번째 슬라이드를 활성화 (범위를 벗어나면 순환되도록 나머지 연산 사용)
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

    // 점 인디케이터 클릭 시 해당 슬라이드로 즉시 이동 후 자동재생 재시작
    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => { showSlide(i); startAutoPlay(); });
    });

    const prevBtn = document.getElementById("heroPrev");
    const nextBtn = document.getElementById("heroNext");
    if (prevBtn) prevBtn.addEventListener("click", () => { prev(); startAutoPlay(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { next(); startAutoPlay(); });

    // 마우스를 배너 위에 올리면 자동재생 일시정지, 벗어나면 재개
    slider.addEventListener("mouseenter", stopAutoPlay);
    slider.addEventListener("mouseleave", startAutoPlay);

    showSlide(0);
    startAutoPlay();
}

// ---- 상단 카테고리 네비게이션: 현재 보고 있는 페이지/카테고리에 맞는 탭만 빨간색으로 강조 ----
function initCategoryNav() {
    const nav = document.querySelector(".category-nav");
    if (!nav) return;

    // 목록 페이지(04_list.html)인 경우: URL의 ?cat= 쿼리 파라미터로 현재 카테고리 판단
    const isListPage = location.pathname.split("/").pop() === "04_list.html";
    const current = isListPage
        ? new URLSearchParams(location.search).get("cat") || "all"
        : document.body.dataset.navCurrent || ""; // 그 외 페이지는 body의 data-nav-current 속성값 사용

    nav.querySelectorAll("a[data-nav]").forEach((a) => {
        a.classList.toggle("active", a.dataset.nav === current);
    });
}

// ==========================================================================
// DOM 로드 완료 후, 위에서 정의한 모든 초기화 함수를 순서대로 실행
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    /*applyRoleVisibility();*/
    initDropdowns();
    initHeroSlider();
    initCategoryNav();

    // 오버레이 3종 (챗봇 / 채팅방 / 알림) 초기화
    initOverlay("chatbotPanel", "chatbotBackdrop", ["chatbotFab"], ["chatbotClose"], null, true);
    initOverlay("chatroomPanel", "chatroomBackdrop", ["chatroomTrigger"], ["chatroomClose"], "chatroom-open");
    initOverlay("notificationPanel", "notificationBackdrop", ["notificationTrigger"], ["notificationClose"], "notification-open");

    // 탭 전환이 필요한 모든 영역에 대해 initTabs 적용
    initTabs(".panel-tabs");
    initTabs(".mypage-tabs");
    initTabs(".admin-nav");
    initTabs(".platform-tabs");
    initTabs(".notice-tabs");

    initQuiz();
    initQuizStart();
    initChatroomChat();   // ← 채팅방 관련 기능(입장 버튼 포함) 전부 이 안에서 초기화됨
    initGenreChips();
    initQnaChatbotQuiz();

    /*const roleSwitcher = document.getElementById("demoRoleSwitcher");
    if (roleSwitcher) {
      roleSwitcher.value = DEMO_ROLE;
      roleSwitcher.addEventListener("change", (e) => setDemoRole(e.target.value));
    }*/
});

// ==========================================================================
// 스크롤 시 .section-heading이 화면에 보일 때마다 등장 애니메이션 재생
// ==========================================================================
const headings = document.querySelectorAll('.section-heading');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) { // 요소가 뷰포트 안에 30% 이상 들어왔을 때
            void entry.target.offsetWidth; // 강제 리플로우 (애니메이션을 처음부터 다시 재생시키기 위한 트릭)
            entry.target.style.animation = 'heading-shine 4s ease-in-out infinite, heading-fade-in 0.6s ease-out';
        }
    });
}, { threshold: 0.3 });

headings.forEach(h => observer.observe(h));

// ---- 푸터: 맨 위로 가기 버튼 ----
document.getElementById("footerTopBtn").addEventListener("click", function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
});