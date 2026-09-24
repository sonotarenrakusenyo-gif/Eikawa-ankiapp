const SCENARIO_INDEX_URL = "data/scenarios/index.json";
const LIKES_STORAGE_KEY = "ruka-english-likes-v1";
const VIEW_STORAGE_KEY = "ruka-english-view-v1";

const speakerLabel = {
  you: { text: "あなた", className: "badge-you" },
  partner: { text: "相手", className: "badge-partner" },
};

/** @type {{ id: string, url: string }[]} */
let scenarioRegistry = [];
/** @type {Map<string, object>} */
const scenarioCache = new Map();
let currentView = "all";

function lineKey(scenarioId, lineIndex) {
  return `${scenarioId}:${lineIndex}`;
}

function loadLikes() {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLikes(likes) {
  localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
}

function isLineLiked(scenarioId, lineIndex) {
  return Boolean(loadLikes()[lineKey(scenarioId, lineIndex)]);
}

function setLineLiked(scenarioId, lineIndex, liked) {
  const likes = loadLikes();
  const key = lineKey(scenarioId, lineIndex);
  if (liked) {
    likes[key] = {
      scenarioId,
      lineIndex,
      likedAt: Date.now(),
    };
  } else {
    delete likes[key];
  }
  saveLikes(likes);
  updateLikeCountBadge();
}

function getLikeCount() {
  return Object.keys(loadLikes()).length;
}

function updateLikeCountBadge() {
  const el = document.getElementById("like-count");
  if (el) el.textContent = String(getLikeCount());
}

function speakEnglish(text, button) {
  if (!window.speechSynthesis) {
    alert("このブラウザでは読み上げが使えません。Chrome や Safari を試してください。");
    return;
  }

  window.speechSynthesis.cancel();
  document.querySelectorAll(".play-btn.playing").forEach((el) => el.classList.remove("playing"));

  const cleaned = text.replace(/\s*\(laughs\)\s*/gi, "").trim();
  const utter = new SpeechSynthesisUtterance(cleaned);
  utter.lang = "en-US";
  utter.rate = 0.92;

  const voices = window.speechSynthesis.getVoices();
  const enVoice =
    voices.find((v) => v.lang.startsWith("en-US") && v.name.includes("Samantha")) ||
    voices.find((v) => v.lang.startsWith("en-US")) ||
    voices.find((v) => v.lang.startsWith("en"));
  if (enVoice) utter.voice = enVoice;

  utter.onstart = () => button.classList.add("playing");
  utter.onend = () => button.classList.remove("playing");
  utter.onerror = () => button.classList.remove("playing");

  window.speechSynthesis.speak(utter);
}

function makePlayButton(english) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "play-btn";
  btn.setAttribute("aria-label", "英文を読み上げ");
  btn.textContent = "🔊";
  btn.addEventListener("click", () => speakEnglish(english, btn));
  return btn;
}

function makeRevealButton(card) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "reveal-btn";
  btn.textContent = "答えを見る";
  btn.addEventListener("click", () => {
    const revealed = card.classList.toggle("is-revealed");
    btn.textContent = revealed ? "隠す" : "答えを見る";
    if (!revealed) {
      const playing = card.querySelector(".play-btn.playing");
      if (playing) {
        window.speechSynthesis?.cancel();
        playing.classList.remove("playing");
      }
    }
  });
  return btn;
}

function makeLikeButton(scenarioId, lineIndex, card, onChange) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "like-btn";
  btn.setAttribute("aria-label", "いいね");

  const sync = () => {
    const liked = isLineLiked(scenarioId, lineIndex);
    btn.classList.toggle("is-liked", liked);
    btn.setAttribute("aria-pressed", liked ? "true" : "false");
    btn.textContent = liked ? "♥" : "♡";
    card.classList.toggle("is-liked", liked);
  };

  sync();

  btn.addEventListener("click", () => {
    const next = !isLineLiked(scenarioId, lineIndex);
    setLineLiked(scenarioId, lineIndex, next);
    sync();
    onChange?.(next);
  });

  return btn;
}

function createLineCard({
  scenarioId,
  scenarioTitle,
  line,
  lineIndex,
  lineTotal,
  showSource = false,
  onLikeChange,
}) {
  const card = document.createElement("article");
  card.className = "line-card";
  card.dataset.lineKey = lineKey(scenarioId, lineIndex);

  const sp = speakerLabel[line.speaker] || { text: line.speaker, className: "" };

  const meta = document.createElement("div");
  meta.className = "line-meta";

  if (showSource && scenarioTitle) {
    const source = document.createElement("span");
    source.className = "line-source";
    source.textContent = `📁 ${scenarioTitle}（${lineIndex + 1}番）`;
    meta.appendChild(source);
  }

  const speaker = document.createElement("span");
  speaker.className = sp.className;
  speaker.textContent = sp.text;

  const num = document.createElement("span");
  num.className = "line-num";
  num.textContent = `${lineIndex + 1} / ${lineTotal}`;

  const spacer = document.createElement("span");
  spacer.className = "line-meta-spacer";
  spacer.setAttribute("aria-hidden", "true");

  const likeBtn = makeLikeButton(scenarioId, lineIndex, card, (liked) => {
    onLikeChange?.(liked, card);
  });

  meta.append(speaker, num, spacer, likeBtn);

  const body = document.createElement("div");
  body.className = "line-body";
  body.innerHTML = `<p class="line-ja">${escapeHtml(line.ja)}</p>`;

  const answer = document.createElement("div");
  answer.className = "line-answer";
  answer.innerHTML = `
    <p class="line-en">${escapeHtml(line.en)}</p>
    <p class="line-katakana">${escapeHtml(line.katakana)}</p>
  `;

  if (line.enAlt) {
    const alt = document.createElement("div");
    alt.className = "line-alt";
    alt.innerHTML = `
      <div class="line-alt-label">言い方の別案</div>
      <p class="line-en">${escapeHtml(line.enAlt)}</p>
      <p class="line-katakana">${escapeHtml(line.katakanaAlt || "")}</p>
    `;
    answer.appendChild(alt);
  }

  body.appendChild(answer);

  const actions = document.createElement("div");
  actions.className = "line-actions";
  actions.appendChild(makeRevealButton(card));
  actions.appendChild(makePlayButton(line.en));

  card.append(meta, body, actions);
  return card;
}

function setupBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";

  const showAfter = 320;

  const onScroll = () => {
    if (window.scrollY > showAfter) {
      btn.hidden = false;
      btn.classList.add("is-visible");
    } else {
      btn.classList.remove("is-visible");
      btn.hidden = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function setupViewTabs() {
  const nav = document.getElementById("view-tabs");
  if (!nav || nav.dataset.bound) return;
  nav.dataset.bound = "1";
  nav.hidden = false;

  nav.addEventListener("click", (e) => {
    const tab = e.target.closest(".view-tab");
    if (!tab) return;
    const view = tab.dataset.view;
    if (!view || view === currentView) return;
    currentView = view;
    localStorage.setItem(VIEW_STORAGE_KEY, view);
    nav.querySelectorAll(".view-tab").forEach((t) => t.classList.toggle("is-active", t.dataset.view === view));
    renderCurrentView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

async function fetchScenario(url) {
  if (scenarioCache.has(url)) return scenarioCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`会話の読み込み失敗 (${res.status}): ${url}`);
  const data = await res.json();
  scenarioCache.set(url, data);
  return data;
}

async function loadScenarioRegistry() {
  try {
    const res = await fetch(SCENARIO_INDEX_URL);
    if (res.ok) {
      const index = await res.json();
      if (index.scenarios?.length) {
        scenarioRegistry = index.scenarios;
        return;
      }
    }
  } catch {
    /* fallback below */
  }
  scenarioRegistry = [{ id: "01-first-friend", url: "data/scenarios/01-first-friend.json" }];
}

function renderScenarioFull(data) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const header = document.createElement("section");
  header.className = "scenario-header";
  header.innerHTML = `
    <h2>${escapeHtml(data.title)}</h2>
    <p class="subtitle">${escapeHtml(data.subtitle)}</p>
    <div class="tags">${data.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
  `;

  if (data.notes?.length) {
    const notes = document.createElement("details");
    notes.className = "notes";
    notes.innerHTML = `<summary>語彙・ポイント（${data.notes.length}件）</summary><ul>${data.notes
      .map((n) => `<li><strong>${escapeHtml(n.phrase)}</strong> — ${escapeHtml(n.meaning)}</li>`)
      .join("")}</ul>`;
    header.appendChild(notes);
  }

  app.appendChild(header);

  const total = data.lines.length;
  data.lines.forEach((line, index) => {
    app.appendChild(
      createLineCard({
        scenarioId: data.id,
        scenarioTitle: data.title,
        line,
        lineIndex: index,
        lineTotal: total,
        showSource: false,
      })
    );
  });
}

async function renderLikesView() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const likes = loadLikes();
  const entries = Object.values(likes).sort((a, b) => b.likedAt - a.likedAt);

  const header = document.createElement("section");
  header.className = "scenario-header";
  header.innerHTML = `
    <h2>いいねしたセリフ</h2>
    <p class="subtitle">♡ を付けた文だけをまとめて復習できます（このブラウザに保存されます）。</p>
  `;
  app.appendChild(header);

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "likes-empty";
    empty.innerHTML =
      "<p><strong>まだいいねがありません</strong></p><p>全会話の各カード右上の ♡ を押すと、ここに集まります。</p>";
    app.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    const reg = scenarioRegistry.find((s) => s.id === entry.scenarioId);
    if (!reg) continue;

    let data;
    try {
      data = await fetchScenario(reg.url);
    } catch {
      continue;
    }

    const line = data.lines[entry.lineIndex];
    if (!line) continue;

    app.appendChild(
      createLineCard({
        scenarioId: data.id,
        scenarioTitle: data.title,
        line,
        lineIndex: entry.lineIndex,
        lineTotal: data.lines.length,
        showSource: true,
        onLikeChange: (liked, card) => {
          if (!liked && currentView === "likes") {
            card.remove();
            if (!app.querySelector(".line-card")) {
              renderLikesView();
            }
          }
        },
      })
    );
  }
}

async function renderCurrentView() {
  const app = document.getElementById("app");
  app.innerHTML = `<p class="loading">読み込み中…</p>`;

  try {
    if (currentView === "likes") {
      await renderLikesView();
      return;
    }

    const first = scenarioRegistry[0];
    if (!first) throw new Error("会話が登録されていません");
    const data = await fetchScenario(first.url);
    renderScenarioFull(data);
  } catch (err) {
    app.innerHTML = `
      <div class="error">
        <p><strong>表示できませんでした。</strong></p>
        <p>${escapeHtml(err.message)}</p>
        <p>ターミナルでこのフォルダに移動して、次を実行してからブラウザで <code>http://localhost:8080</code> を開いてください。</p>
        <pre>cd "/Users/ruka/Documents/日常英会話音読暗記"
python3 -m http.server 8080</pre>
      </div>
    `;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function init() {
  setupBackToTop();
  setupViewTabs();
  updateLikeCountBadge();

  const savedView = localStorage.getItem(VIEW_STORAGE_KEY);
  if (savedView === "likes" || savedView === "all") {
    currentView = savedView;
    document.querySelectorAll(".view-tab").forEach((t) => {
      t.classList.toggle("is-active", t.dataset.view === currentView);
    });
  }

  await loadScenarioRegistry();
  await renderCurrentView();
}

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {};
}

init();
