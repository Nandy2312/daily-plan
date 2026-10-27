/* Daily Plan — everything lives in this phone's storage (localStorage). No server, no account. */
"use strict";

const STORE_KEY = "dailyplan.v1";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

const AREAS = {
  food: "Food",
  workout: "Workout",
  work: "Work",
  dance: "Dance",
  money: "Money",
  outings: "Outings",
  home: "Home",
};

/* ---------- starting plan (from the notebook) ---------- */

function seed() {
  return {
    version: 1,
    startedOn: todayKey(), // days before this don't count against you
    habits: [
      { id: uid(), area: "food", title: "Healthy food today", note: "Cook akka on weekdays, batch-cook Sunday", days: ALL_DAYS },
      { id: uid(), area: "workout", title: "Strength — 20 min at home", note: "Before opening the laptop", days: [1, 3, 5] },
      { id: uid(), area: "workout", title: "Run", note: "Easy pace, 20–30 min", days: [2, 4] },
      { id: uid(), area: "work", title: "Deep work block 1", note: "Phone in another room · 90 min", days: WEEKDAYS },
      { id: uid(), area: "work", title: "Deep work block 2", note: "Phone in another room · 90 min", days: WEEKDAYS },
      { id: uid(), area: "work", title: "Learn for 1 hour", note: "AI / GenAI solution architect topics", days: WEEKDAYS },
      { id: uid(), area: "money", title: "No unplanned spending", note: "", days: ALL_DAYS },
    ],
    weekly: [
      { id: uid(), area: "dance", title: "Post a dance video", target: 1 },
      { id: uid(), area: "dance", title: "Film a content batch", target: 1 },
      { id: uid(), area: "workout", title: "Swim", target: 1 },
      { id: uid(), area: "work", title: "Portfolio update", target: 1 },
      { id: uid(), area: "outings", title: "Outing", target: 1 },
    ],
    goals: [
      { id: uid(), area: "food", title: "Confirm cook akka for weekday meals", done: false },
      { id: uid(), area: "money", title: "Set up auto-transfer to savings on salary day", done: false },
      { id: uid(), area: "home", title: "Pick a move-by date for the new house", done: false },
      { id: uid(), area: "work", title: "Write up DanceFlow for the portfolio", done: false },
      { id: uid(), area: "work", title: "Write up Kiln for the portfolio", done: false },
      { id: uid(), area: "dance", title: "Post the first dance video", done: false },
    ],
    log: {},      // "YYYY-MM-DD" -> { habitId: true }
    weekLog: {},  // "YYYY-MM-DD" (Monday) -> { weeklyId: count }
    money: { target: 0, saved: {} }, // saved: "YYYY-MM" -> amount
    house: {
      moveBy: "",
      budget: 0,
      criteria: [
        { id: uid(), title: "Close to work", done: false },
        { id: uid(), title: "Close to dance class", done: false },
        { id: uid(), title: "Kitchen that works for the cook", done: false },
        { id: uid(), title: "Space for a home workout", done: false },
        { id: uid(), title: "Rent within budget", done: false },
      ],
      places: [], // { id, name, rent, notes, rating }
    },
    reminders: { workout: "07:00", deepwork: "10:00", review: "19:00" },
  };
}

/* ---------- storage ---------- */

let state = load();
let ui = { tab: "today", date: todayKey(), week: weekKey(new Date()) };

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(seed(), JSON.parse(raw));
  } catch (e) { /* fall through to a fresh plan */ }
  return seed();
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast("Couldn't save — storage is full or blocked"); }
}

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- dates ---------- */

function uid() { return Math.random().toString(36).slice(2, 10); }
function pad(n) { return String(n).padStart(2, "0"); }
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parse(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(key, n) { const d = parse(key); d.setDate(d.getDate() + n); return ymd(d); }
function todayKey() { return ymd(new Date()); }
function weekKey(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return ymd(x); }
function monthKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function weekDates(wk) { return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(wk, i)); }

function fmtLong(key) {
  return parse(key).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}
function fmtShort(key) {
  return parse(key).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/* ---------- habit maths ---------- */

function scheduled(dateKey) {
  const dow = parse(dateKey).getDay();
  return state.habits.filter((h) => h.days.includes(dow));
}
function isDone(dateKey, id) { return !!(state.log[dateKey] && state.log[dateKey][id]); }

function dayPct(dateKey) {
  if (dateKey < state.startedOn) return null;
  const list = scheduled(dateKey);
  if (!list.length) return null;
  return list.filter((h) => isDone(dateKey, h.id)).length / list.length;
}

// consecutive scheduled days done, counting back from dateKey (today doesn't break it until it's over)
function habitStreak(h, dateKey) {
  let n = 0;
  let key = dateKey;
  if (!isDone(key, h.id)) key = addDays(key, -1);
  for (let i = 0; i < 400; i++) {
    if (h.days.includes(parse(key).getDay())) {
      if (!isDone(key, h.id)) break;
      n++;
    }
    key = addDays(key, -1);
  }
  return n;
}

// consecutive days at 80%+ of the plan
function goodDayStreak() {
  let n = 0;
  let key = todayKey();
  if ((dayPct(key) ?? 0) < 0.8) key = addDays(key, -1);
  for (let i = 0; i < 400 && key >= state.startedOn; i++) {
    const p = dayPct(key);
    if (p === null) { key = addDays(key, -1); continue; }
    if (p < 0.8) break;
    n++;
    key = addDays(key, -1);
  }
  return n;
}

function weekCount(wk, id) { return (state.weekLog[wk] && state.weekLog[wk][id]) || 0; }

/* ---------- small render helpers ---------- */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const col = (area) => `style="--c: var(--${AREAS[area] ? area : "work"})"`;
const tick = `<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 19l7 7L31 7"/></svg>`;

function ring(p) {
  const r = 27, c = 2 * Math.PI * r, pct = Math.round((p || 0) * 100);
  return `<svg class="ring" viewBox="0 0 64 64" role="img" aria-label="${pct}% done">
    <circle class="track" cx="32" cy="32" r="${r}"/>
    <circle class="fill" cx="32" cy="32" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - (p || 0))}"/>
    <text x="32" y="38" text-anchor="middle">${pct}%</text></svg>`;
}

function areaOptions(selected) {
  return Object.entries(AREAS).map(([k, v]) => `<option value="${k}"${k === selected ? " selected" : ""}>${v}</option>`).join("");
}

function groupByArea(items) {
  const groups = {};
  for (const it of items) (groups[it.area] = groups[it.area] || []).push(it);
  return Object.keys(AREAS).filter((a) => groups[a]).map((a) => [a, groups[a]]);
}

function money(n) {
  return Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

/* ---------- screens ---------- */

function renderToday() {
  const key = ui.date;
  const isToday = key === todayKey();
  const list = scheduled(key);
  const done = list.filter((h) => isDone(key, h.id)).length;
  const streak = goodDayStreak();
  const wk = weekKey(parse(key));

  const groups = groupByArea(list).map(([area, habits]) => `
    <div class="area-tag" ${col(area)}>${AREAS[area]}</div>
    <div class="card">
      ${habits.map((h) => {
        const s = habitStreak(h, key);
        return `<button class="check${isDone(key, h.id) ? " done" : ""}" data-act="toggle" data-id="${h.id}" ${col(h.area)}>
          <span class="box">${tick}</span>
          <span class="label"><span class="title">${esc(h.title)}</span>${h.note ? `<span class="sub">${esc(h.note)}</span>` : ""}</span>
          ${s > 1 ? `<span class="streak">${s} in a row</span>` : ""}
        </button>`;
      }).join("")}
    </div>`).join("");

  return `
    <div class="head-row">
      <div>
        <p class="eyebrow">${isToday ? "Today" : "Looking back"}</p>
        <h1>${esc(fmtLong(key))}</h1>
        ${isToday ? "" : `<button class="today-link" data-act="goto-today">Back to today</button>`}
      </div>
      <div class="date-nav">
        <button class="icon-btn" data-act="day" data-n="-1" aria-label="Previous day">‹</button>
        <button class="icon-btn" data-act="day" data-n="1" aria-label="Next day" ${isToday ? "disabled" : ""}>›</button>
      </div>
    </div>

    <div class="progress">
      ${ring(list.length ? done / list.length : 0)}
      <div class="progress-text">
        <strong>${done} of ${list.length} done</strong>
        <span>${streak ? `${streak} good day${streak > 1 ? "s" : ""} in a row` : "A good day = 80% of the plan"}</span>
      </div>
    </div>

    ${list.length ? groups : `<div class="card empty" style="margin-top:18px">Nothing planned for this day. Rest is part of the plan.</div>`}

    <h2>This week <small>${fmtShort(wk)} – ${fmtShort(addDays(wk, 6))}</small></h2>
    ${weeklyCard(wk)}
  `;
}

function weeklyCard(wk) {
  if (!state.weekly.length) return `<div class="card empty">No weekly goals yet — add them in Setup.</div>`;
  return `<div class="card">${state.weekly.map((w) => {
    const n = weekCount(wk, w.id);
    const dots = Array.from({ length: Math.max(w.target, n) }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
    return `<div class="counter" ${col(w.area)}>
      <div class="label"><div>${esc(w.title)}</div><div class="dots">${dots}</div></div>
      <div class="step">
        <button data-act="wk" data-wk="${wk}" data-id="${w.id}" data-n="-1" aria-label="Less">−</button>
        <b>${n}/${w.target}</b>
        <button data-act="wk" data-wk="${wk}" data-id="${w.id}" data-n="1" aria-label="More">+</button>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function renderWeek() {
  const wk = ui.week;
  const dates = weekDates(wk);
  const today = todayKey();
  const isThisWeek = wk === weekKey(new Date());

  const strip = dates.map((k) => {
    const p = dayPct(k);
    const future = k > today;
    return `<button class="day${k === today ? " is-today" : ""}" data-act="open-day" data-date="${k}" ${future ? "disabled" : ""} style="border-style:solid">
      ${DAY_NAMES[parse(k).getDay()]}<b>${parse(k).getDate()}</b>
      <div class="pct" style="--p:${future || p === null ? 0 : Math.round(p * 100)}"></div>
    </button>`;
  }).join("");

  const rows = state.habits.map((h) => `<tr ${col(h.area)}>
      <td class="hname">${esc(h.title)}</td>
      ${dates.map((k) => {
        const planned = h.days.includes(parse(k).getDay());
        return `<td><span class="cell ${!planned ? "off" : isDone(k, h.id) ? "on" : ""}"></span></td>`;
      }).join("")}
    </tr>`).join("");

  const vals = dates.filter((k) => k <= today).map(dayPct).filter((p) => p !== null);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

  return `
    <div class="head-row">
      <div>
        <p class="eyebrow">${isThisWeek ? "This week" : "Week of"}</p>
        <h1>${fmtShort(wk)} – ${fmtShort(addDays(wk, 6))}</h1>
        ${isThisWeek ? "" : `<button class="today-link" data-act="this-week">Back to this week</button>`}
      </div>
      <div class="date-nav">
        <button class="icon-btn" data-act="week" data-n="-7" aria-label="Previous week">‹</button>
        <button class="icon-btn" data-act="week" data-n="7" aria-label="Next week" ${isThisWeek ? "disabled" : ""}>›</button>
      </div>
    </div>

    <div class="progress">
      ${ring(avg)}
      <div class="progress-text"><strong>Average day: ${Math.round(avg * 100)}%</strong><span>Tap a day to fill in what you missed</span></div>
    </div>

    <div class="strip">${strip}</div>

    <h2>Weekly goals</h2>
    ${weeklyCard(wk)}

    <h2>Habits by day</h2>
    <div class="card">
      <table class="grid">
        <thead><tr><th></th>${dates.map((k) => `<th>${DAY_LETTERS[parse(k).getDay()]}</th>`).join("")}</tr></thead>
        <tbody>${rows || `<tr><td colspan="8" class="empty">No habits yet</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderPlan() {
  const g = state.goals;
  const open = g.filter((x) => !x.done).length;
  const mk = monthKey(new Date());
  const savedNow = Number(state.money.saved[mk] || 0);
  const target = Number(state.money.target || 0);

  // last 6 months of savings
  const months = [];
  const d = new Date(); d.setDate(1);
  for (let i = 5; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); months.push(monthKey(x)); }
  const maxV = Math.max(target, ...months.map((m) => Number(state.money.saved[m] || 0)), 1);
  const bars = months.map((m) => {
    const v = Number(state.money.saved[m] || 0);
    const label = new Date(+m.slice(0, 4), +m.slice(5) - 1, 1).toLocaleDateString(undefined, { month: "short" });
    return `<div><i class="${target && v < target ? "miss" : ""}" style="height:${(v / maxV) * 70}px"></i>${label}</div>`;
  }).join("");

  const h = state.house;
  const daysLeft = h.moveBy ? Math.round((parse(h.moveBy) - parse(todayKey())) / 86400000) : null;
  const places = [...h.places].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return `
    <p class="eyebrow">One-time things</p>
    <h1>The plan</h1>
    <p class="note">${open ? `<strong>${open}</strong> still open. Do the decisions first — they make every day easier.` : "Everything here is done. Add the next one."}</p>

    <h2>To decide &amp; set up</h2>
    <div class="card">
      ${g.map((x) => `<div class="check${x.done ? " done" : ""}" ${col(x.area)} style="cursor:default">
          <button class="box" data-act="goal" data-id="${x.id}" aria-label="Mark done" style="background:none;padding:0">${tick}</button>
          <span class="label"><span class="title">${esc(x.title)}</span><span class="sub">${AREAS[x.area]}${x.doneAt ? ` · done ${fmtShort(x.doneAt)}` : ""}</span></span>
          <button class="x" data-act="del-goal" data-id="${x.id}" aria-label="Delete">×</button>
        </div>`).join("") || `<div class="empty">Nothing yet.</div>`}
      <div class="edit-item">
        <div class="row">
          <input type="text" id="new-goal" placeholder="Add something to decide…" enterkeyhint="done">
          <select id="new-goal-area">${areaOptions("home")}</select>
        </div>
        <div class="btn-row"><button class="btn small" data-act="add-goal">Add</button></div>
      </div>
    </div>

    <h2>Money <small>${new Date().toLocaleDateString(undefined, { month: "long" })}</small></h2>
    <div class="card pad" ${col("money")}>
      <div class="head-row">
        <div><div class="big-num">${money(savedNow)}</div><div class="note" style="margin:4px 0 0">saved this month${target ? ` of ${money(target)}` : ""}</div></div>
      </div>
      ${target ? `<div class="meter"><i style="width:${Math.min(100, (savedNow / target) * 100)}%"></i></div>` : ""}
      <div class="row">
        <label class="field"><span>Saved this month</span><input type="number" inputmode="numeric" min="0" data-bind="saved" value="${savedNow || ""}" placeholder="0"></label>
        <label class="field"><span>Monthly target</span><input type="number" inputmode="numeric" min="0" data-bind="target" value="${target || ""}" placeholder="0"></label>
      </div>
      <div class="bars">${bars}</div>
      <p class="note">Set the transfer to happen on salary day, then just note the amount here.</p>
    </div>

    <h2>New house ${daysLeft !== null ? `<small>${daysLeft >= 0 ? `${daysLeft} days left` : `${-daysLeft} days past the date`}</small>` : ""}</h2>
    <div class="card pad" ${col("home")}>
      <div class="row">
        <label class="field"><span>Move by</span><input type="date" data-bind="moveBy" value="${esc(h.moveBy)}"></label>
        <label class="field"><span>Rent budget / month</span><input type="number" inputmode="numeric" min="0" data-bind="budget" value="${h.budget || ""}" placeholder="0"></label>
      </div>
    </div>

    <div class="area-tag" ${col("home")}>Must have</div>
    <div class="card">
      ${h.criteria.map((c) => `<button class="check${c.done ? " done" : ""}" data-act="crit" data-id="${c.id}" ${col("home")}>
          <span class="box">${tick}</span><span class="label"><span class="title">${esc(c.title)}</span></span>
        </button>`).join("")}
    </div>

    <div class="area-tag" ${col("home")}>Places seen</div>
    <div class="card">
      ${places.map((p) => `<div class="place">
          <div class="place-head"><b>${esc(p.name)}</b><span>${p.rent ? money(p.rent) : ""}${h.budget && p.rent > h.budget ? " · over" : ""}</span></div>
          ${p.notes ? `<p>${esc(p.notes)}</p>` : ""}
          <div class="row" style="align-items:center">
            <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button class="${n <= (p.rating || 0) ? "on" : ""}" data-act="rate" data-id="${p.id}" data-n="${n}" aria-label="${n} stars">★</button>`).join("")}</div>
            <button class="x" data-act="del-place" data-id="${p.id}" aria-label="Delete place">×</button>
          </div>
        </div>`).join("") || `<div class="empty">No places yet.</div>`}
      <div class="edit-item">
        <div class="row">
          <input type="text" id="place-name" placeholder="Area / building">
          <input type="number" id="place-rent" inputmode="numeric" placeholder="Rent" style="flex:0 0 110px">
        </div>
        <textarea id="place-notes" rows="2" placeholder="Notes — commute, kitchen, light…" style="margin-top:8px"></textarea>
        <div class="btn-row"><button class="btn small" data-act="add-place">Add place</button></div>
      </div>
    </div>
  `;
}

function renderSettings() {
  const r = state.reminders;
  return `
    <p class="eyebrow">Setup</p>
    <h1>Shape the plan</h1>

    <h2>Daily habits</h2>
    <div class="card">
      ${state.habits.map((h) => `<div class="edit-item" ${col(h.area)}>
          <div class="row">
            <input type="text" value="${esc(h.title)}" data-edit="habit" data-id="${h.id}" data-key="title" aria-label="Habit">
            <button class="x" data-act="del-habit" data-id="${h.id}" aria-label="Delete habit">×</button>
          </div>
          <div class="row" style="margin-top:8px">
            <input type="text" value="${esc(h.note)}" data-edit="habit" data-id="${h.id}" data-key="note" placeholder="Note (optional)" aria-label="Note">
            <select data-edit="habit" data-id="${h.id}" data-key="area" aria-label="Area">${areaOptions(h.area)}</select>
          </div>
          <div class="daypick">${WEEK_ORDER.map((d) => `<button class="${h.days.includes(d) ? "on" : ""}" data-act="habit-day" data-id="${h.id}" data-d="${d}">${DAY_NAMES[d]}</button>`).join("")}</div>
        </div>`).join("")}
      <div class="edit-item"><button class="btn small ghost" data-act="add-habit">+ Add habit</button></div>
    </div>

    <h2>Weekly goals</h2>
    <div class="card">
      ${state.weekly.map((w) => `<div class="edit-item">
          <div class="row">
            <input type="text" value="${esc(w.title)}" data-edit="weekly" data-id="${w.id}" data-key="title" aria-label="Weekly goal">
            <button class="x" data-act="del-weekly" data-id="${w.id}" aria-label="Delete goal">×</button>
          </div>
          <div class="row" style="margin-top:8px">
            <select data-edit="weekly" data-id="${w.id}" data-key="area" aria-label="Area">${areaOptions(w.area)}</select>
            <label class="row" style="align-items:center;gap:6px"><span class="note" style="margin:0;flex:none">Times / week</span>
              <input type="number" min="1" max="14" inputmode="numeric" value="${w.target}" data-edit="weekly" data-id="${w.id}" data-key="target"></label>
          </div>
        </div>`).join("")}
      <div class="edit-item"><button class="btn small ghost" data-act="add-weekly">+ Add weekly goal</button></div>
    </div>

    <h2>Reminders</h2>
    <div class="card pad">
      <p class="note" style="margin-top:0">Home-screen web apps can't ring on their own, so this adds repeating events with alerts to your iPhone Calendar.</p>
      <div class="row">
        <label class="field"><span>Workout</span><input type="time" data-bind="rem-workout" value="${r.workout}"></label>
        <label class="field"><span>Deep work</span><input type="time" data-bind="rem-deepwork" value="${r.deepwork}"></label>
        <label class="field"><span>Sunday review</span><input type="time" data-bind="rem-review" value="${r.review}"></label>
      </div>
      <div class="btn-row"><button class="btn" data-act="ics">Add to Calendar</button></div>
    </div>

    <h2>Backup</h2>
    <div class="card pad">
      <p class="note" style="margin-top:0">Your plan is stored only on this phone. Save a backup now and then.</p>
      <div class="btn-row">
        <button class="btn ghost" data-act="export">Save backup</button>
        <button class="btn ghost" data-act="import">Restore backup</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </div>
    </div>

    <h2>Put it on your home screen</h2>
    <details class="card">
      <summary>How to install on iPhone</summary>
      <div class="pad">
        <ol class="steps">
          <li>Open this page in <strong>Safari</strong>.</li>
          <li>Tap the <strong>Share</strong> button.</li>
          <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Open it from the icon — it runs full-screen and works offline.</li>
        </ol>
      </div>
    </details>

    <div class="btn-row" style="margin-top:28px"><button class="btn danger small" data-act="reset">Start over with the original plan</button></div>
  `;
}

/* ---------- render + routing ---------- */

const screens = { today: renderToday, week: renderWeek, plan: renderPlan, settings: renderSettings };
const screenEl = document.getElementById("screen");

function render(keepScroll) {
  const y = window.scrollY;
  screenEl.innerHTML = screens[ui.tab]();
  document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === ui.tab));
  if (keepScroll) { screenEl.style.animation = "none"; window.scrollTo(0, y); }
  else { screenEl.style.animation = ""; window.scrollTo(0, 0); }
}

function go(tab) {
  ui.tab = tab;
  if (tab === "today") ui.date = todayKey();
  if (tab === "week") ui.week = weekKey(new Date());
  try { localStorage.setItem("dailyplan.tab", tab); } catch (e) {}
  render(false);
}

document.querySelector(".tabbar").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]");
  if (b) go(b.dataset.tab);
});

/* ---------- actions ---------- */

const find = (arr, id) => arr.find((x) => x.id === id);

const actions = {
  toggle(b) {
    const day = (state.log[ui.date] = state.log[ui.date] || {});
    if (day[b.dataset.id]) delete day[b.dataset.id]; else day[b.dataset.id] = true;
    if (navigator.vibrate) navigator.vibrate(8);
    const p = dayPct(ui.date);
    if (p === 1 && day[b.dataset.id]) toast("Whole plan done today. Well done!");
  },
  day(b) { const next = addDays(ui.date, +b.dataset.n); if (next <= todayKey()) ui.date = next; return "top"; },
  "goto-today"() { ui.date = todayKey(); return "top"; },
  week(b) { ui.week = addDays(ui.week, +b.dataset.n); return "top"; },
  "this-week"() { ui.week = weekKey(new Date()); return "top"; },
  "open-day"(b) { ui.tab = "today"; ui.date = b.dataset.date; return "top"; },
  wk(b) {
    const log = (state.weekLog[b.dataset.wk] = state.weekLog[b.dataset.wk] || {});
    log[b.dataset.id] = Math.max(0, (log[b.dataset.id] || 0) + +b.dataset.n);
  },
  goal(b) {
    const g = find(state.goals, b.dataset.id);
    g.done = !g.done;
    g.doneAt = g.done ? todayKey() : undefined;
  },
  "del-goal"(b) { state.goals = state.goals.filter((x) => x.id !== b.dataset.id); },
  "add-goal"() {
    const t = document.getElementById("new-goal").value.trim();
    if (!t) return "noop";
    state.goals.push({ id: uid(), area: document.getElementById("new-goal-area").value, title: t, done: false });
  },
  crit(b) { const c = find(state.house.criteria, b.dataset.id); c.done = !c.done; },
  rate(b) { find(state.house.places, b.dataset.id).rating = +b.dataset.n; },
  "del-place"(b) { state.house.places = state.house.places.filter((x) => x.id !== b.dataset.id); },
  "add-place"() {
    const name = document.getElementById("place-name").value.trim();
    if (!name) return "noop";
    state.house.places.push({
      id: uid(), name,
      rent: Number(document.getElementById("place-rent").value) || 0,
      notes: document.getElementById("place-notes").value.trim(),
      rating: 0,
    });
  },
  "habit-day"(b) {
    const h = find(state.habits, b.dataset.id);
    const d = +b.dataset.d;
    h.days = h.days.includes(d) ? h.days.filter((x) => x !== d) : [...h.days, d].sort();
  },
  "del-habit"(b) {
    const h = find(state.habits, b.dataset.id);
    if (!confirm(`Delete “${h.title}”? Its history goes too.`)) return "noop";
    state.habits = state.habits.filter((x) => x.id !== h.id);
  },
  "add-habit"() { state.habits.push({ id: uid(), area: "work", title: "New habit", note: "", days: ALL_DAYS.slice() }); },
  "del-weekly"(b) { state.weekly = state.weekly.filter((x) => x.id !== b.dataset.id); },
  "add-weekly"() { state.weekly.push({ id: uid(), area: "dance", title: "New weekly goal", target: 1 }); },
  ics() { downloadIcs(); return "noop"; },
  export() { exportBackup(); return "noop"; },
  import() { document.getElementById("import-file").click(); return "noop"; },
  reset() {
    if (!confirm("Replace everything with the original plan? Ticks and notes will be lost.")) return "noop";
    state = seed();
    toast("Plan reset");
  },
};

screenEl.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || !actions[b.dataset.act]) return;
  const res = actions[b.dataset.act](b);
  if (res === "noop") return;
  save();
  render(res !== "top");
});

// text / select / number edits — saved on change so typing never loses focus
screenEl.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "import-file") return importBackup(el.files[0]);

  if (el.dataset.edit) {
    const list = el.dataset.edit === "habit" ? state.habits : state.weekly;
    const item = find(list, el.dataset.id);
    let v = el.value;
    if (el.dataset.key === "target") v = Math.max(1, Math.min(14, Number(v) || 1));
    if (el.dataset.key === "title" && !v.trim()) { el.value = item.title; return; }
    item[el.dataset.key] = v;
    save();
    if (el.dataset.key === "area") render(true);
    return;
  }

  const bind = el.dataset.bind;
  if (!bind) return;
  const num = Math.max(0, Number(el.value) || 0);
  if (bind === "saved") state.money.saved[monthKey(new Date())] = num;
  else if (bind === "target") state.money.target = num;
  else if (bind === "moveBy") state.house.moveBy = el.value;
  else if (bind === "budget") state.house.budget = num;
  else if (bind.startsWith("rem-")) { state.reminders[bind.slice(4)] = el.value; save(); return; }
  save();
  render(true);
});

screenEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (e.target.id === "new-goal") document.querySelector('[data-act="add-goal"]').click();
  if (e.target.id === "place-name" || e.target.id === "place-rent") document.querySelector('[data-act="add-place"]').click();
});

/* ---------- calendar reminders (.ics) ---------- */

function icsTime(dateKey, hhmm) { return dateKey.replace(/-/g, "") + "T" + hhmm.replace(":", "") + "00"; }

function downloadIcs() {
  const r = state.reminders;
  const start = todayKey();
  // first matching date on/after today for a given weekday
  const next = (dow) => { let k = start; while (parse(k).getDay() !== dow) k = addDays(k, 1); return k; };
  const workoutDays = [...new Set(state.habits.filter((h) => h.area === "workout").flatMap((h) => h.days))];
  const byday = (days) => days.map((d) => ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][d]).join(",");

  const events = [];
  if (workoutDays.length) events.push({ title: "Workout — 20 min at home", date: start, time: r.workout, rule: `FREQ=WEEKLY;BYDAY=${byday(workoutDays)}` });
  events.push({ title: "Deep work — phone in another room", date: start, time: r.deepwork, rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", mins: 90 });
  events.push({ title: "Weekly review — Daily Plan", date: next(0), time: r.review, rule: "FREQ=WEEKLY;BYDAY=SU", mins: 20 });

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Daily Plan//EN", "CALSCALE:GREGORIAN"];
  for (const ev of events) {
    const [h, m] = ev.time.split(":").map(Number);
    const endMin = h * 60 + m + (ev.mins || 30);
    const end = `${pad(Math.floor(endMin / 60) % 24)}:${pad(endMin % 60)}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid()}-${Date.now()}@dailyplan`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTime(ev.date, ev.time)}`,
      `DTEND:${icsTime(ev.date, end)}`,
      `RRULE:${ev.rule}`,
      `SUMMARY:${ev.title}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${ev.title}`, "TRIGGER:-PT0M", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  shareOrDownload(lines.join("\r\n"), "daily-plan-reminders.ics", "text/calendar");
}

/* ---------- backup ---------- */

function exportBackup() {
  shareOrDownload(JSON.stringify(state, null, 2), `daily-plan-backup-${todayKey()}.json`, "application/json");
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.habits) || typeof data.log !== "object") throw new Error("bad");
      state = Object.assign(seed(), data);
      save();
      render(false);
      toast("Backup restored");
    } catch (e) { toast("That file isn't a Daily Plan backup"); }
  };
  reader.readAsText(file);
}

async function shareOrDownload(text, name, type) {
  const file = new File([text], name, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; }
    catch (e) { if (e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------- toast ---------- */

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- start ---------- */

// a new day while the app sat open in the background → jump to it
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && ui.tab === "today" && ui.date < todayKey()) { ui.date = todayKey(); render(false); }
});

try { const t = localStorage.getItem("dailyplan.tab"); if (t && screens[t]) ui.tab = t; } catch (e) {}
save();
render(false);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
