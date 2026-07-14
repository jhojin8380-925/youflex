// ==========================================================================
// OTT 리뷰 웹사이트 - 화면 초안 공통 인터랙션 (와이어프레임 목업용)
// ==========================================================================

// ---- 로그인/권한 상태 시뮬레이션 (실제 구현 시 인증 상태로 대체) ----
const DEMO_ROLE = localStorage.getItem("demoRole") || "guest"; // guest | user | critic | admin

function applyRoleVisibility() {
  document.querySelectorAll("[data-role-visible]").forEach((el) => {
    const allowed = el.dataset.roleVisible.split(",").map((r) => r.trim());
    el.style.display = allowed.includes(DEMO_ROLE) ? "" : "none";
  });
}

function setDemoRole(role) {
  localStorage.setItem("demoRole", role);
  location.reload();
}

// ---- 오버레이 패널 (챗봇 / 채팅방) ----
function initOverlay(panelId, backdropId, openTriggerIds, closeTriggerIds, bodyClass, toggleOnTrigger) {
  const panel = document.getElementById(panelId);
  const backdrop = document.getElementById(backdropId);
  if (!panel) return;

  const open = () => {
    panel.classList.add("open");
    backdrop && backdrop.classList.add("open");
    if (bodyClass) document.body.classList.add(bodyClass);
  };
  const close = () => {
    panel.classList.remove("open");
    backdrop && backdrop.classList.remove("open");
    if (bodyClass) document.body.classList.remove(bodyClass);
  };

  openTriggerIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => {
      if (toggleOnTrigger && panel.classList.contains("open")) close();
      else open();
    });
  });
  closeTriggerIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", close);
  });
  backdrop && backdrop.addEventListener("click", close);
}

// ---- 탭 전환 공통 ----
function initTabs(tabGroupSelector) {
  document.querySelectorAll(tabGroupSelector).forEach((group) => {
    const buttons = group.querySelectorAll("[data-tab-target]");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetSelector = btn.dataset.tabTarget;
        const tabContainer = btn.closest("[data-tab-panels]");
        const panelGroup = (tabContainer && tabContainer.parentElement) || document;
        const panels = panelGroup.querySelectorAll("[data-tab-panel]");

        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        panels.forEach((p) => {
          p.style.display = p.dataset.tabPanel === targetSelector ? "" : "none";
        });
      });
    });
  });
}

// ==========================================================================
// 챗봇 퀴즈: DB에서 객관식 1문제 + OX 1문제를 뽑아 출제, 하루 3번 제한
// (실제 구현 시 questionBank는 서버 DB 조회 결과로 대체)
// ==========================================================================
const QNA_QUIZ_DAILY_LIMIT = 3;
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

function qnaQuizTodayKey() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function qnaQuizAttemptsLeft() {
  const today = qnaQuizTodayKey();
  if (localStorage.getItem('qnaQuizDate') !== today) {
    localStorage.setItem('qnaQuizDate', today);
    localStorage.setItem('qnaQuizAttemptsLeft', String(QNA_QUIZ_DAILY_LIMIT));
  }
  return Number(localStorage.getItem('qnaQuizAttemptsLeft') || QNA_QUIZ_DAILY_LIMIT);
}

function qnaQuizUseAttempt() {
  const left = Math.max(0, qnaQuizAttemptsLeft() - 1);
  localStorage.setItem('qnaQuizAttemptsLeft', String(left));
  return left;
}

function qnaQuizPickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function initQnaChatbotQuiz() {
  const startBtn = document.getElementById('qnaQuizStartBtn');
  const countLabel = document.getElementById('qnaQuizCount');
  const playBox = document.getElementById('qnaQuizPlay');
  const progressLabel = document.getElementById('qnaQuizProgress');
  const questionLabel = document.getElementById('qnaQuizQuestion');
  const optionsBox = document.getElementById('qnaQuizOptions');
  const nextBtn = document.getElementById('qnaQuizNextBtn');
  const resultBox = document.getElementById('qnaQuizResult');
  if (!startBtn) return;

  let questions = [];
  let step = 0;
  let correctCount = 0;

  function renderCount() {
    const left = qnaQuizAttemptsLeft();
    countLabel.textContent = `🎯 오늘 남은 퀴즈 횟수: ${left}/${QNA_QUIZ_DAILY_LIMIT}`;
    startBtn.disabled = left <= 0;
    startBtn.textContent = left <= 0 ? '오늘 퀴즈를 모두 사용했어요' : '퀴즈 시작';
  }

  function renderQuestion() {
    const q = questions[step];
    progressLabel.textContent = `문제 ${step + 1}/${questions.length} · ${q.type === 'mc' ? '객관식' : 'OX'}`;
    questionLabel.textContent = q.question;
    optionsBox.innerHTML = '';
    nextBtn.style.display = 'none';

    const choices = q.type === 'mc'
      ? q.options.map((label, i) => ({ label, correct: i === q.answerIndex }))
      : [{ label: 'O', correct: q.answer === true }, { label: 'X', correct: q.answer === false }];

    choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.textContent = choice.label;
      btn.dataset.correct = String(choice.correct);
      btn.addEventListener('click', () => {
        Array.from(optionsBox.children).forEach((b) => (b.disabled = true));
        if (choice.correct) {
          btn.classList.add('correct');
          correctCount += 1;
        } else {
          btn.classList.add('wrong');
          const correctBtn = Array.from(optionsBox.children).find((b) => b.dataset.correct === 'true');
          if (correctBtn) correctBtn.classList.add('correct');
        }
        if (step < questions.length - 1) {
          nextBtn.style.display = 'inline-block';
        } else {
          finishQuiz();
        }
      });
      optionsBox.appendChild(btn);
    });
  }

  function finishQuiz() {
    const left = qnaQuizUseAttempt();
    playBox.style.display = 'none';
    resultBox.style.display = 'block';
    resultBox.textContent = `✅ 2문제 중 ${correctCount}문제를 맞히셨어요! (오늘 남은 횟수 ${left}/${QNA_QUIZ_DAILY_LIMIT})`;
    renderCount();
  }

  startBtn.addEventListener('click', () => {
    if (qnaQuizAttemptsLeft() <= 0) return;
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

  nextBtn.addEventListener('click', () => {
    step += 1;
    renderQuestion();
  });

  renderCount();
}

initQnaChatbotQuiz();

// ---- 방장(평론가) 퇴장 시 채팅방 삭제 경고 ----
function confirmRoomLeave() {
  const ok = confirm(
    "방장이 퇴장하면 채팅방이 삭제되고 대화 내용이 모두 사라집니다.\n정말 퇴장하시겠습니까?"
  );
  if (ok) {
    alert("채팅방이 삭제되었습니다. (데모)");
  }
}

// ---- 채팅방: 방장(평론가/관리자)의 채팅 내 경고 부여 ----
function giveChatWarning() {
  const name = prompt("경고를 부여할 사용자의 닉네임을 입력하세요.");
  if (!name || !name.trim()) return;
  const messages = document.getElementById("chatroomMessages");
  if (!messages) return;
  const msg = document.createElement("div");
  msg.className = "chat-msg system warning";
  msg.textContent = `⚠ ${name.trim()}님 경고 1회`;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

// ---- 퀴즈 인터랙션 (챗봇 패널) ----
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

// ---- 퀴즈 시작 버튼 (챗봇 패널) ----
function initQuizStart() {
  const startBtn = document.getElementById("quizStartBtn");
  const options = document.getElementById("quizOptions");
  if (!startBtn || !options) return;
  startBtn.addEventListener("click", () => {
    options.style.display = "grid";
    startBtn.disabled = true;
  });
}

// ---- 채팅방: 실시간 채팅 입력/전송 & 방 개설(최대 인원) ----
function initChatroomChat() {
  const messages = document.getElementById("chatroomMessages");
  const input = document.getElementById("chat_message_content");
  const sendBtn = document.getElementById("chatroomSendBtn");
  if (messages && input && sendBtn) {
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

  const roomNameInput = document.getElementById("chatroom_title");
  const maxUserInput = document.getElementById("chatroom_max_member");
  const createBtn = document.getElementById("chatroomCreateBtn");
  if (roomNameInput && maxUserInput && createBtn) {
    createBtn.addEventListener("click", () => {
      const name = roomNameInput.value.trim();
      const maxUsers = Number(maxUserInput.value);
      if (!name) {
        alert("방 이름을 입력해주세요.");
        return;
      }
      if (!maxUsers || maxUsers < 2) {
        alert("최대 인원은 2명 이상으로 입력해주세요.");
        return;
      }
      alert(`채팅방이 개설되었습니다. (데모)\n방 이름: ${name}\n최대 인원: ${maxUsers}명`);
      roomNameInput.value = "";
      maxUserInput.value = "30";
    });
  }
}

// ---- 취향/장르 선택 칩 (회원가입 / 마이페이지 공용) ----
function initGenreChips() {
  document.querySelectorAll(".genre-chip").forEach((chip) => {
    chip.addEventListener("click", () => chip.classList.toggle("selected"));
  });
}

// ---- 드롭다운 메뉴 (마이페이지 등) ----
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

// ---- 히어로 배너 슬라이더 (점 인디케이터 전환) ----
function initHeroSlider() {
  const slider = document.querySelector(".hero-slider");
  const slides = document.querySelectorAll(".hero-slide-content");
  const dots = document.querySelectorAll(".hero-dots span");
  if (!slider || !slides.length) return;

// 배너 3초 마다 자동으로 바뀜 -나영-
  const AUTO_PLAY_MS = 3000;
  let index = 0;
  let timerId = null;
console.log(slides.length);

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

document.addEventListener("DOMContentLoaded", () => {
  applyRoleVisibility();
  initDropdowns();
  initHeroSlider();
  initCategoryNav();

  initOverlay("chatbotPanel", "chatbotBackdrop", ["chatbotFab"], ["chatbotClose"], null, true);
  initOverlay("chatroomPanel", "chatroomBackdrop", ["chatroomTrigger"], ["chatroomClose"], "chatroom-open");
  initOverlay("notificationPanel", "notificationBackdrop", ["notificationTrigger"], ["notificationClose"], "notification-open");

  initTabs(".panel-tabs");
  initTabs(".mypage-tabs");
  initTabs(".admin-nav");
  initTabs(".platform-tabs");
  initTabs(".notice-tabs");

  initQuiz();
  initQuizStart();
  initChatroomChat();
  initGenreChips();

  const roleSwitcher = document.getElementById("demoRoleSwitcher");
  if (roleSwitcher) {
    roleSwitcher.value = DEMO_ROLE;
    roleSwitcher.addEventListener("change", (e) => setDemoRole(e.target.value));
  }
});
// 화면에 .section-heading이 보일 때마다 등장 애니메이션 재생 -나영-
const headings = document.querySelectorAll('.section-heading');
const observer = new IntersectionObserver((entries) => {
  // console.log('IntersectionObserver entries:', entries);
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // entry.target.style.animation = 'none';
      // 강제로 리플로우 시켜서 애니메이션 재시작
      void entry.target.offsetWidth;
      entry.target.style.animation = 'heading-shine 4s ease-in-out infinite, heading-fade-in 0.6s ease-out';
    }
  });
}, { threshold: 0.3 });

// 푸터 - 맨 위로 가기 버튼
headings.forEach(h => observer.observe(h));

document
        .getElementById("footerTopBtn")
        .addEventListener("click", function () {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });