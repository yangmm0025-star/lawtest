// ============ State ============
const state = {
  currentSection: "bank",
  currentSubject: "all",
  currentQuestionIdx: 0,
  answeredQuestions: {},    // { qId: selectedIdx }
  wrongAnswers: [],          // array from localStorage
  examState: null,           // null or { questions:[], answers:{}, currentIdx, timeLeft, timerId, finished }
};

// ============ Init ============
function init() {
  loadWrongAnswers();
  initNavigation();
  initSubjectTabs();
  showSection("bank");
  updateProgress();
  updateWrongBadge();
  // renderQuestionBank(); (called from showSection)
}

// ============ Navigation ============
function initNavigation() {
  document.querySelectorAll(".nav-item").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      const section = el.dataset.section;
      showSection(section);
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      el.classList.add("active");
      if (window.innerWidth <= 768) {
        toggleSidebar(false);
      }
    });
  });
}

function showSection(name) {
  state.currentSection = name;
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(`section-${name}`);
  if (target) target.classList.add("active");

  switch (name) {
    case "bank":
      // renderQuestionBank(); (called from showSection)
      break;
    case "exam":
      renderExamSection();
      break;
    case "wrong":
      renderWrongAnswers();
      break;
  }
}

// ============ Sidebar toggle (mobile) ============
function toggleSidebar(open) {
  document.querySelector(".sidebar").classList.toggle("open", open);
  document.querySelector(".sidebar-overlay").classList.toggle("open", open);
}

// ============ Subject Tabs ============
function initSubjectTabs() {
  document.querySelectorAll(".subject-tab").forEach(el => {
    el.addEventListener("click", () => {
      state.currentSubject = el.dataset.subject;
      state.currentQuestionIdx = 0;
      document.querySelectorAll(".subject-tab").forEach(t => t.classList.remove("active"));
      el.classList.add("active");
      // renderQuestionBank(); (called from showSection)
    });
  });
}

// ============ Filtered Questions ============
function getFilteredQuestions() {
  if (state.currentSubject === "all") return QUESTIONS;
  return QUESTIONS.filter(q => q.subject === state.currentSubject);
}

// ============ Question Bank ============
function renderQuestionBank() {
  const container = document.getElementById("qbank-container");
  const filtered = getFilteredQuestions();
  if (filtered.length === 0) {
    container.innerHTML = `<div class="wrong-empty"><div class="big-icon">📚</div><p>该科目暂无题目</p></div>`;
    return;
  }
  const idx = Math.min(state.currentQuestionIdx, filtered.length - 1);
  const q = filtered[idx];
  if (!q) return;

  document.getElementById("qbank-counter").textContent =
    `第 ${idx + 1} / ${filtered.length} 题（${q.subject}）`;

  let dotsHtml = "";
  filtered.forEach((fq, i) => {
    let cls = "q-dot";
    if (i === idx) cls += " current";
    const ans = state.answeredQuestions[fq.id];
    if (ans !== undefined) cls += " answered";
    dotsHtml += `<div class="${cls}" data-idx="${i}">${i + 1}</div>`;
  });
  document.getElementById("qbank-dots").innerHTML = dotsHtml;
  document.querySelectorAll("#qbank-dots .q-dot").forEach(el => {
    el.addEventListener("click", () => {
      state.currentQuestionIdx = parseInt(el.dataset.idx);
      // renderQuestionBank(); (called from showSection)
    });
  });

  const selected = state.answeredQuestions[q.id];
  renderQuestion(q, selected, "qbank-question", (qId, optIdx) => {
    state.answeredQuestions[qId] = optIdx;
    const isCorrect = optIdx === q.answer;
    if (!isCorrect) {
      addWrongAnswer(qId, optIdx);
    } else {
      // If user previously got it wrong but now correct, remove from wrong
      removeWrongAnswer(qId);
    }
    // renderQuestionBank(); (called from showSection)
    updateProgress();
    updateWrongBadge();
  });

  document.getElementById("qbank-prev").onclick = () => {
    if (idx > 0) { state.currentQuestionIdx = idx - 1; renderQuestionBank(); }
  };
  document.getElementById("qbank-next").onclick = () => {
    if (idx < filtered.length - 1) { state.currentQuestionIdx = idx + 1; renderQuestionBank(); }
  };
  document.getElementById("qbank-prev").disabled = idx === 0;
  document.getElementById("qbank-next").disabled = idx === filtered.length - 1;
}

function renderQuestion(q, selectedIdx, containerId, onSelect) {
  const container = document.getElementById(containerId);
  const answered = selectedIdx !== undefined;
  const correct = answered && selectedIdx === q.answer;

  let optionsHtml = q.options.map((opt, i) => {
    let cls = "option";
    if (answered) cls += " disabled";
    if (answered && i === selectedIdx) {
      cls += correct ? " correct" : " wrong";
    }
    if (answered && i === q.answer && i !== selectedIdx) {
      cls += " correct";
    }
    return `<div class="${cls}" data-optidx="${i}">
      <span class="opt-letter">${String.fromCharCode(65 + i)}</span>
      <span>${opt}</span>
    </div>`;
  }).join("");

  let feedbackHtml = "";
  if (answered) {
    const status = correct ? "correct" : "wrong";
    const statusText = correct ? "✓ 回答正确！" : "✗ 回答错误";
    feedbackHtml = `<div class="feedback-box ${status}">
      <div class="exp-label">${statusText}</div>
      <div class="exp-text">${q.exp}</div>
    </div>`;
  }

  container.innerHTML = `
    <div class="question-subject">${q.subject}</div>
    <div class="question-text">${q.q}</div>
    <div class="options">${optionsHtml}</div>
    ${feedbackHtml}
  `;

  if (!answered) {
    container.querySelectorAll(".option").forEach(el => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.optidx);
        onSelect(q.id, idx);
      });
    });
  }
}

// ============ Wrong Answers ============
function loadWrongAnswers() {
  try {
    const data = localStorage.getItem("fakao_wrong");
    state.wrongAnswers = data ? JSON.parse(data) : [];
  } catch { state.wrongAnswers = []; }
}

function saveWrongAnswers() {
  localStorage.setItem("fakao_wrong", JSON.stringify(state.wrongAnswers));
}

function addWrongAnswer(qId, selectedIdx) {
  const existing = state.wrongAnswers.find(w => w.qId === qId);
  if (existing) {
    existing.selectedIdx = selectedIdx;
    existing.timestamp = Date.now();
  } else {
    state.wrongAnswers.push({ qId, selectedIdx, timestamp: Date.now() });
  }
  saveWrongAnswers();
}

function removeWrongAnswer(qId) {
  const before = state.wrongAnswers.length;
  state.wrongAnswers = state.wrongAnswers.filter(w => w.qId !== qId);
  if (state.wrongAnswers.length !== before) saveWrongAnswers();
}

function updateWrongBadge() {
  const badge = document.getElementById("wrong-badge");
  if (badge) {
    badge.textContent = state.wrongAnswers.length;
    badge.style.display = state.wrongAnswers.length > 0 ? "inline" : "none";
  }
}

function updateProgress() {
  const answered = Object.keys(state.answeredQuestions).length;
  const total = QUESTIONS.length;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
  document.getElementById("progress-pct").textContent = `${pct}%`;
  document.getElementById("progress-fill").style.width = `${pct}%`;
  document.getElementById("progress-label").textContent = `${answered} / ${total}`;
}

function renderWrongAnswers() {
  const container = document.getElementById("wrong-container");
  if (state.wrongAnswers.length === 0) {
    container.innerHTML = `<div class="wrong-empty"><div class="big-icon">🎉</div><p>暂无错题记录，继续保持！</p></div>`;
    return;
  }

  // Build summary: group wrong answers by code
  const byCode = {};
  state.wrongAnswers.forEach(w => {
    const q = QUESTIONS.find(qq => qq.id === w.qId);
    if (!q) return;
    const code = q.code || q.subject;
    if (!byCode[code]) byCode[code] = { count: 0, topics: {} };
    byCode[code].count++;
    const topic = q.topic || "综合";
    if (!byCode[code].topics[topic]) byCode[code].topics[topic] = 0;
    byCode[code].topics[topic]++;
  });

  // Summary HTML
  let summaryHtml = `<div class="wrong-summary">
    <h3>📊 薄弱知识点概览</h3>
    <div class="summary-grid">`;
  const sortedCodes = Object.entries(byCode).sort((a, b) => b[1].count - a[1].count);
  sortedCodes.forEach(([code, data]) => {
    const topicsList = Object.entries(data.topics)
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => `<span class="topic-tag">${t}（${c}题）</span>`)
      .join(" ");
    summaryHtml += `<div class="summary-card">
      <div class="sc-head">
        <span class="sc-code">${code}</span>
        <span class="sc-count">${data.count} 道错题</span>
      </div>
      <div class="sc-topics">${topicsList}</div>
    </div>`;
  });
  summaryHtml += `<div class="summary-card tip-card">
    <div class="sc-head"><span>💡 复习建议</span></div>
    <div class="sc-topics" style="color:var(--gray-500);font-size:.82rem;line-height:1.6;">
      错题数量最多的法典是你的薄弱环节。建议优先复习排名靠前的法典，重点突破高频错题对应的知识点后再回刷。
    </div>
  </div>`;
  summaryHtml += `</div></div>`;

  // Filter tabs by code
  let filterHtml = `<div class="wrong-filters">`;
  filterHtml += `<button class="wrong-filter active" data-wcode="all" onclick="filterWrong('all')">全部</button>`;
  sortedCodes.forEach(([code]) => {
    filterHtml += `<button class="wrong-filter" data-wcode="${code}" onclick="filterWrong('${code}')">${code}</button>`;
  });
  filterHtml += `</div>`;

  // Items list
  const filteredCode = state.wrongFilter || "all";
  const items = state.wrongAnswers
    .filter(w => {
      if (filteredCode === "all") return true;
      const q = QUESTIONS.find(qq => qq.id === w.qId);
      return q && (q.code === filteredCode || q.subject === filteredCode);
    })
    .map(w => {
      const q = QUESTIONS.find(qq => qq.id === w.qId);
      if (!q) return "";
      const selectedLetter = String.fromCharCode(65 + w.selectedIdx);
      const correctLetter = String.fromCharCode(65 + q.answer);
      return `<div class="wrong-item">
        <div class="wi-meta">
          <span class="wi-code">${q.code || q.subject}</span>
          <span class="wi-topic">${q.topic || "综合"}</span>
          <span class="wi-subject">${q.subject}</span>
        </div>
        <div class="wi-question">${q.q}</div>
        <div class="wi-answers">
          <span class="wrong-ans">你的答案：${selectedLetter}. ${q.options[w.selectedIdx]}</span>
          <span class="right-ans">正确答案：${correctLetter}. ${q.options[q.answer]}</span>
        </div>
        <div class="wi-explain">${q.exp}</div>
      </div>`;
    }).filter(Boolean).join("");

  container.innerHTML = summaryHtml + filterHtml + items + `<div style="text-align:center;margin-top:16px;">
    <button class="btn btn-danger-outline" onclick="clearWrongAnswers()">清空错题记录</button>
  </div>`;
}

function filterWrong(code) {
  state.wrongFilter = code;
  document.querySelectorAll(".wrong-filter").forEach(el => {
    el.classList.toggle("active", el.dataset.wcode === code);
  });
  renderWrongAnswers();
}

function clearWrongAnswers() {
  if (confirm("确定要清空所有错题记录吗？")) {
    state.wrongAnswers = [];
    saveWrongAnswers();
    updateWrongBadge();
    renderWrongAnswers();
  }
}

// ============ Mock Exam ============
function renderExamSection() {
  const container = document.getElementById("exam-container");

  if (!state.examState || state.examState.finished) {
    // Show start screen
    container.innerHTML = `
      <div class="exam-start">
        <h2>📝 模拟考试</h2>
        <p>随机抽取 20 道题目，限时 60 分钟</p>
        <div class="rules">
          <li>题目涵盖所有法考科目</li>
          <li>每题选择一个答案后不可更改</li>
          <li>60 分钟倒计时，超时自动交卷</li>
          <li>交卷后显示成绩和解析</li>
        </div>
        <button class="btn btn-primary" onclick="startExam()" style="font-size:1rem;padding:12px 36px;">
          开始考试
        </button>
      </div>
    `;
    return;
  }

  // Exam in progress
  renderExamActive();
}

function startExam() {
  // Pick 20 random questions
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 20);
  state.examState = {
    questions: selected,
    answers: {},
    currentIdx: 0,
    timeLeft: 60 * 60,
    finished: false,
  };
  renderExamActive();
  startExamTimer();
}

function startExamTimer() {
  if (state.examState.timerId) clearInterval(state.examState.timerId);
  state.examState.timerId = setInterval(() => {
    state.examState.timeLeft--;
    updateExamTimer();
    if (state.examState.timeLeft <= 0) {
      finishExam();
    }
  }, 1000);
}

function updateExamTimer() {
  const t = state.examState.timeLeft;
  const min = Math.floor(t / 60);
  const sec = t % 60;
  const el = document.getElementById("exam-timer-display");
  if (el) {
    el.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    el.parentElement.className = "exam-timer" + (t <= 300 ? " danger" : t <= 600 ? " warning" : "");
  }
}

function renderExamActive() {
  const es = state.examState;
  if (!es) return;
  const container = document.getElementById("exam-container");
  const q = es.questions[es.currentIdx];

  let paletteHtml = es.questions.map((qq, i) => {
    let cls = "palette-dot";
    if (i === es.currentIdx) cls += " current";
    if (es.answers[qq.id] !== undefined) cls += " answered";
    return `<div class="${cls}" data-exmidx="${i}">${i + 1}</div>`;
  }).join("");

  container.innerHTML = `
    <div class="exam-header">
      <div class="exam-progress-text">第 ${es.currentIdx + 1} / ${es.questions.length} 题</div>
      <div class="exam-timer">
        <span>⏱</span>
        <span id="exam-timer-display">60:00</span>
      </div>
      <button class="btn btn-danger-outline btn-sm" onclick="confirmFinishExam()">交卷</button>
    </div>
    <div class="exam-body">
      <div class="exam-main">
        <div id="exam-question"></div>
        <div class="exam-actions">
          <button class="btn btn-outline btn-sm" id="exam-prev" ${es.currentIdx === 0 ? "disabled" : ""}>上一题</button>
          <button class="btn btn-outline btn-sm" id="exam-next" ${es.currentIdx === es.questions.length - 1 ? "disabled" : ""}>下一题</button>
        </div>
      </div>
      <div class="exam-palette">
        <h4>答题卡</h4>
        <div class="palette-dots">${paletteHtml}</div>
        <div style="margin-top: 10px; font-size: .72rem; color: var(--gray-400);">
          <span style="display:inline-block;width:12px;height:12px;background:var(--primary);border-radius:50%;vertical-align:middle;margin-right:4px;"></span> 已答
          <span style="display:inline-block;width:12px;height:12px;background:var(--gray-100);border-radius:50%;vertical-align:middle;margin-right:4px;margin-left:8px;"></span> 未答
        </div>
      </div>
    </div>
  `;

  renderQuestion(q, es.answers[q.id], "exam-question", (qId, optIdx) => {
    if (es.answers[qId] === undefined) {
      es.answers[qId] = optIdx;
      renderExamActive();
    }
  });

  document.getElementById("exam-prev").onclick = () => {
    if (es.currentIdx > 0) { es.currentIdx--; renderExamActive(); }
  };
  document.getElementById("exam-next").onclick = () => {
    if (es.currentIdx < es.questions.length - 1) { es.currentIdx++; renderExamActive(); }
  };

  updateExamTimer();
}

function confirmFinishExam() {
  const es = state.examState;
  const answered = Object.keys(es.answers).length;
  if (answered < es.questions.length) {
    if (!confirm(`还有 ${es.questions.length - answered} 题未作答，确定要交卷吗？`)) return;
  } else {
    if (!confirm("所有题目已作答，确定要交卷吗？")) return;
  }
  finishExam();
}

function finishExam() {
  const es = state.examState;
  if (es.timerId) { clearInterval(es.timerId); es.timerId = null; }
  es.finished = true;

  let correct = 0;
  const details = es.questions.map(q => {
    const userAns = es.answers[q.id];
    const isCorrect = userAns !== undefined && userAns === q.answer;
    if (isCorrect) correct++;
    // Record wrong answers
    if (userAns !== undefined && !isCorrect) {
      addWrongAnswer(q.id, userAns);
    }
    if (userAns !== undefined && isCorrect) {
      removeWrongAnswer(q.id);
    }
    return { q, userAns, isCorrect };
  });
  updateWrongBadge();

  const total = es.questions.length;
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= 60;

  const container = document.getElementById("exam-container");
  container.innerHTML = `
    <div class="exam-result">
      <h2>${passed ? "🎉 恭喜通过！" : "💪 继续加油！"}</h2>
      <div class="score-circle ${passed ? "pass" : "fail"}">${pct}%</div>
      <div class="detail-row">
        <div class="detail-item"><div class="num">${correct}</div><div class="lbl">正确</div></div>
        <div class="detail-item"><div class="num">${total - correct}</div><div class="lbl">错误</div></div>
        <div class="detail-item"><div class="num">${total}</div><div class="lbl">总分</div></div>
      </div>
      <button class="btn btn-primary" onclick="showExamReview()">查看详细解析</button>
      <button class="btn btn-outline" onclick="resetExam()" style="margin-left:8px;">重新考试</button>
    </div>
    <div id="exam-review" style="display:none;margin-top:20px;"></div>
  `;
  updateProgress();

  // Store review data
  state.examReview = details;
}

function showExamReview() {
  const details = state.examReview;
  if (!details) return;
  const container = document.getElementById("exam-review");
  container.style.display = "block";

  const html = details.map((d, i) => {
    const q = d.q;
    const answered = d.userAns !== undefined;
    const correct = d.isCorrect;
    let optionsHtml = q.options.map((opt, j) => {
      let cls = "option disabled";
      if (answered && j === d.userAns) cls += correct ? " correct" : " wrong";
      if (j === q.answer && j !== d.userAns) cls += " correct";
      return `<div class="${cls}"><span class="opt-letter">${String.fromCharCode(65 + j)}</span><span>${opt}</span></div>`;
    }).join("");
    const status = !answered ? "未作答" : correct ? "✓ 正确" : "✗ 错误";
    return `<div class="question-card">
      <div class="question-subject">${q.subject} · ${status}</div>
      <div class="question-text">${i + 1}. ${q.q}</div>
      <div class="options">${optionsHtml}</div>
      <div class="feedback-box ${correct ? "correct" : "wrong"}">
        <div class="exp-text">${q.exp}</div>
      </div>
    </div>`;
  }).join("");
  container.innerHTML = html;
}

function resetExam() {
  if (state.examState && state.examState.timerId) {
    clearInterval(state.examState.timerId);
  }
  state.examState = null;
  state.examReview = null;
  renderExamSection();
}

// ============ Videos ============
// Static data for video links — actual Bilibili video links
const VIDEOS = [
  { title: "2025法考 民法精讲（钟秀勇）", channel: "瑞达法考", url: "https://www.bilibili.com/video/BV1GJ411x7Kt", desc: "民法基础精讲，涵盖民事法律行为、代理、诉讼时效等核心内容" },
  { title: "2025法考 刑法精讲（柏浪涛）", channel: "柏杜法考", url: "https://www.bilibili.com/video/BV1HK4y1a7Nu", desc: "刑法总则与分则系统讲解，重点罪名深度分析" },
  { title: "2025法考 行政法（李佳）", channel: "法考在线", url: "https://www.bilibili.com/video/BV1RZ4y1H7QB", desc: "行政法与行政诉讼法核心考点，行政处罚、许可、强制" },
  { title: "2025法考 民诉法（戴鹏）", channel: "众合法考", url: "https://www.bilibili.com/video/BV1YQ4y1P7jA", desc: "民事诉讼法精讲，管辖、当事人、证据、程序" },
  { title: "2025法考 刑诉法（左宁）", channel: "众合法考", url: "https://www.bilibili.com/video/BV1m54y1B7zG", desc: "刑事诉讼法核心知识，强制措施、证据、审判程序" },
  { title: "2025法考 商经知（郄鹏恩）", channel: "瑞达法考", url: "https://www.bilibili.com/video/BV1Kt4y1j7Wg", desc: "公司法、合伙企业法、破产法等重点商法内容" },
  { title: "2025法考 理论法（马峰）", channel: "柏杜法考", url: "https://www.bilibili.com/video/BV1ZE411N7Kn", desc: "宪法、法理学、法制史、职业道德系统精讲" },
  { title: "2025法考 三国法（杨帆）", channel: "瑞达法考", url: "https://www.bilibili.com/video/BV1v4411o7XG", desc: "国际公法、国际私法、国际经济法考点精讲" },
  { title: "法考历年真题解析（2018-2024）", channel: "法考课堂", url: "https://www.bilibili.com/video/BV1kQ4y1Z7m5", desc: "近六年法考客观题真题逐题精讲" },
  { title: "法考主观题冲刺技巧", channel: "法考名师", url: "https://www.bilibili.com/video/BV1fV411z7Pu", desc: "主观题答题技巧、案例分析模板、时间分配策略" },
  { title: "2025法考 知识产权法", channel: "瑞达法考", url: "https://www.bilibili.com/video/BV1nt4y1X7eL", desc: "著作权、专利权、商标权核心考点及案例分析" },
  { title: "法考备考方法论与规划", channel: "法考规划局", url: "https://www.bilibili.com/video/BV1hE411T7Xs", desc: "法考备考全程规划、各科时间分配、复习策略" },
];

// ============ Init on load ============
document.addEventListener("DOMContentLoaded", () => {
  // Render videos
  const videoGrid = document.getElementById("video-grid");
  if (videoGrid) {
    videoGrid.innerHTML = VIDEOS.map(v => `
      <a href="${v.url}" target="_blank" rel="noopener" class="video-card">
        <div class="video-card-thumb">
          📺
          <div class="play-overlay"><div class="play-icon">▶</div></div>
        </div>
        <div class="video-card-body">
          <h3>${v.title}</h3>
          <div class="meta"><span>${v.channel}</span></div>
          <div class="desc">${v.desc}</div>
        </div>
      </a>
    `).join("");
  }

  // Mobile sidebar toggle
  document.getElementById("menu-btn").addEventListener("click", () => toggleSidebar(true));
  document.querySelector(".sidebar-overlay").addEventListener("click", () => toggleSidebar(false));

  init();
});
