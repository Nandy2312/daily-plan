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
    name: "",
    welcomed: false,
    installHintHidden: false,
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
    budget: {
      income: 0,
      categories: [ // budget = planned spend per month
        { id: uid(), name: "Rent", color: "home", budget: 0 },
        { id: uid(), name: "Food & groceries", color: "food", budget: 0 },
        { id: uid(), name: "Cook akka", color: "food", budget: 0 },
        { id: uid(), name: "Transport", color: "outings", budget: 0 },
        { id: uid(), name: "Bills & phone", color: "work", budget: 0 },
        { id: uid(), name: "Dance", color: "dance", budget: 0 },
        { id: uid(), name: "Outings", color: "outings", budget: 0 },
        { id: uid(), name: "Shopping", color: "money", budget: 0 },
        { id: uid(), name: "Health & gym", color: "workout", budget: 0 },
        { id: uid(), name: "Other", color: "work", budget: 0 },
      ],
      expenses: [], // { id, date: "YYYY-MM-DD", amount, catId, note }
    },
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
let ui = { tab: "today", date: todayKey(), week: weekKey(new Date()), month: monthKey(new Date()) };

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

const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

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

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return state.name ? `${part}, ${state.name}` : part;
}

function daysLabel(days) {
  const s = [...days].sort().join();
  if (s === ALL_DAYS.join()) return "Every day";
  if (s === WEEKDAYS.join()) return "Weekdays";
  if (s === "0,6") return "Weekends";
  if (!days.length) return "Paused — no days picked";
  return WEEK_ORDER.filter((d) => days.includes(d)).map((d) => DAY_NAMES[d]).join(", ");
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

/* ---------- money maths ---------- */

function monthExpenses(mk) { return state.budget.expenses.filter((e) => e.date.startsWith(mk)); }
function sum(arr, f) { return arr.reduce((a, x) => a + (Number(f(x)) || 0), 0); }
function catOf(id) { return state.budget.categories.find((c) => c.id === id) || { name: "Uncategorised", color: "work", budget: 0 }; }
function monthLabel(mk, opts = { month: "long" }) { return new Date(+mk.slice(0, 4), +mk.slice(5) - 1, 1).toLocaleDateString(undefined, opts); }
function addMonths(mk, n) { const d = new Date(+mk.slice(0, 4), +mk.slice(5) - 1 + n, 1); return monthKey(d); }

// what can be spent this month: the category budgets, or income minus savings if no budgets yet
function spendable() {
  const b = state.budget;
  const budgeted = sum(b.categories, (c) => c.budget);
  if (budgeted) return budgeted;
  return b.income ? Math.max(0, b.income - (Number(state.money.target) || 0)) : 0;
}

/* ---------- small render helpers ---------- */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const col = (area) => `style="--c: var(--${AREAS[area] ? area : "work"})"`;
const tick = `<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M7 19l7 7L31 7"/></svg>`;
const chev = `<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`;

function ring(p) {
  const r = 27, c = 2 * Math.PI * r, pct = Math.round((p || 0) * 100);
  return `<svg class="ring" viewBox="0 0 64 64" role="img" aria-label="${pct}% done">
    <circle class="track" cx="32" cy="32" r="${r}"/>
    <circle class="fill" cx="32" cy="32" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - (p || 0))}"/>
    <text x="32" y="38" text-anchor="middle">${pct}%</text></svg>`;
}

function groupByArea(items) {
  const groups = {};
  for (const it of items) (groups[it.area] = groups[it.area] || []).push(it);
  return Object.keys(AREAS).filter((a) => groups[a]).map((a) => [a, groups[a]]);
}

function money(n) {
  return Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function progressLine(done, total) {
  if (!total) return "Rest day";
  if (done === total) return "All done — enjoy the rest of the day";
  const left = total - done;
  if (done === 0) return `${total} small things today`;
  return `${left} more to go`;
}

/* ---------- screens ---------- */

function renderToday() {
  const key = ui.date;
  const isToday = key === todayKey();
  const list = scheduled(key);
  const done = list.filter((h) => isDone(key, h.id)).length;
  const streak = goodDayStreak();
  const wk = weekKey(parse(key));
  const nextId = isToday ? (groupByArea(list).flatMap(([, hs]) => hs).find((h) => !isDone(key, h.id)) || {}).id : null;

  const groups = groupByArea(list).map(([area, habits]) => `
    <div class="area-tag" ${col(area)}>${AREAS[area]}</div>
    <div class="card">
      ${habits.map((h) => {
        const s = habitStreak(h, key);
        return `<button class="check${isDone(key, h.id) ? " done" : ""}${h.id === nextId ? " next" : ""}" data-act="toggle" data-id="${h.id}" ${col(h.area)}>
          <span class="box">${tick}</span>
          <span class="label"><span class="title">${esc(h.title)}</span>${h.note ? `<span class="sub">${esc(h.note)}</span>` : ""}</span>
          ${h.id === nextId ? `<span class="pill">Next</span>` : s > 1 ? `<span class="streak">${s} in a row</span>` : ""}
        </button>`;
      }).join("")}
    </div>`).join("");

  const installHint = isIOS && !standalone && !state.installHintHidden ? `
    <div class="hint card">
      <div>
        <strong>Put Daily Plan on your home screen</strong>
        <span>Tap <svg class="share" viewBox="0 0 24 24" aria-label="Share"><path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1"/></svg> below, then <b>Add to Home Screen</b>.</span>
      </div>
      <button class="x" data-act="hide-hint" aria-label="Hide">×</button>
    </div>` : "";

  return `
    ${installHint}
    <div class="head-row">
      <div>
        <p class="eyebrow">${isToday ? esc(greeting()) : "Looking back"}</p>
        <h1>${esc(fmtLong(key))}</h1>
        ${isToday ? "" : `<button class="today-link" data-act="goto-today">Back to today</button>`}
      </div>
      <div class="date-nav">
        <button class="icon-btn" data-act="day" data-n="-1" aria-label="Previous day">‹</button>
        <button class="icon-btn" data-act="day" data-n="1" aria-label="Next day" ${isToday ? "disabled" : ""}>›</button>
      </div>
    </div>

    <div class="progress${list.length && done === list.length ? " all-done" : ""}">
      ${ring(list.length ? done / list.length : 0)}
      <div class="progress-text">
        <strong>${progressLine(done, list.length)}</strong>
        <span>${streak ? `${streak} good day${streak > 1 ? "s" : ""} in a row` : "Tick each one as you finish it"}</span>
      </div>
    </div>

    ${list.length ? groups : `<div class="card empty" style="margin-top:18px">Nothing planned for this day. Rest is part of the plan.</div>`}

    <h2>This week <small>${fmtShort(wk)} – ${fmtShort(addDays(wk, 6))}</small></h2>
    ${weeklyCard(wk)}

    ${moneyGlance(key)}
    <p class="note center">Swipe left or right to change the day</p>
  `;
}

function weeklyCard(wk) {
  if (!state.weekly.length) return `<div class="card empty">No weekly goals yet. <button class="today-link" data-act="add-weekly">Add one</button></div>`;
  return `<div class="card">${state.weekly.map((w) => {
    const n = weekCount(wk, w.id);
    const dots = Array.from({ length: Math.max(w.target, n) }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
    return `<div class="counter${n >= w.target ? " met" : ""}" ${col(w.area)}>
      <div class="label"><div>${esc(w.title)}</div><div class="dots">${dots}</div></div>
      <div class="step">
        <button data-act="wk" data-wk="${wk}" data-id="${w.id}" data-n="-1" aria-label="One less" ${n ? "" : "disabled"}>−</button>
        <b>${n} of ${w.target}</b>
        <button data-act="wk" data-wk="${wk}" data-id="${w.id}" data-n="1" aria-label="One more">+</button>
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
    return `<button class="day${k === today ? " is-today" : ""}" data-act="open-day" data-date="${k}" ${future ? "disabled" : ""}>
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
      <div class="progress-text"><strong>Your average day: ${Math.round(avg * 100)}%</strong><span>Tap a day to fill in anything you missed</span></div>
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
    <p class="note center"><span class="cell on" style="--c:var(--ink)"></span> done &nbsp; <span class="cell" style="--c:var(--ink)"></span> missed &nbsp; <span class="cell off" style="--c:var(--ink)"></span> not planned</p>
  `;
}

// small money card on Today
function moneyGlance(dateKey) {
  const mk = dateKey.slice(0, 7);
  const exps = monthExpenses(mk);
  const spentToday = sum(exps.filter((e) => e.date === dateKey), (e) => e.amount);
  const left = spendable() - sum(exps, (e) => e.amount);
  return `
    <h2>Money <small>${monthLabel(mk)}</small></h2>
    <div class="card">
      <button class="list-row" data-act="go-money" ${col("money")}>
        <span class="label">
          <span class="title">${spendable() ? (left >= 0 ? `${money(left)} left this month` : `${money(-left)} over budget`) : `${money(sum(exps, (e) => e.amount))} spent this month`}</span>
          <span class="sub">${money(spentToday)} spent ${dateKey === todayKey() ? "today" : "this day"}</span>
        </span>${chev}
      </button>
      <button class="add-row" data-act="add-exp" data-date="${dateKey}">+ Add spending</button>
    </div>`;
}

function renderMoney() {
  const mk = ui.month;
  const nowMk = monthKey(new Date());
  const isThis = mk === nowMk;
  const b = state.budget;
  const exps = monthExpenses(mk).reverse().sort((a, z) => z.date.localeCompare(a.date)); // newest first
  const spent = sum(exps, (e) => e.amount);
  const plan = spendable();
  const left = plan - spent;
  const budgeted = sum(b.categories, (c) => c.budget);
  const target = Number(state.money.target || 0);

  // days left including today, for "per day"
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate() + 1;

  const byCat = {};
  for (const e of exps) byCat[e.catId] = (byCat[e.catId] || 0) + Number(e.amount);

  const hero = plan ? `
    <div class="card pad hero ${left < 0 ? "over" : ""}" ${col("money")}>
      <div class="hero-label">${left >= 0 ? "Left to spend" : "Over budget by"}</div>
      <div class="big-num">${money(Math.abs(left))}</div>
      <div class="meter"><i style="width:${Math.min(100, (spent / plan) * 100)}%"></i></div>
      <div class="hero-row"><span>Spent ${money(spent)}</span><span>Budget ${money(plan)}</span></div>
      ${isThis && left > 0 ? `<p class="note">That's about <strong>${money(Math.floor(left / daysLeft))} a day</strong> for the next ${daysLeft} day${daysLeft > 1 ? "s" : ""}.</p>` : ""}
    </div>` : `
    <div class="card pad hero" ${col("money")}>
      <div class="hero-label">Spent in ${monthLabel(mk)}</div>
      <div class="big-num">${money(spent)}</div>
      <p class="note">Add your income and a budget for each category below to see what's left.</p>
      <div class="btn-row"><button class="btn small" data-act="edit-income">Set up my budget</button></div>
    </div>`;

  const cats = b.categories.map((c) => {
    const s = byCat[c.id] || 0;
    const l = c.budget - s;
    const right = !c.budget ? `<span class="amt muted">${s ? money(s) : "Set budget"}</span>`
      : l >= 0 ? `<span class="amt">${money(l)}<small>left</small></span>`
      : `<span class="amt bad">${money(-l)}<small>over</small></span>`;
    return `<button class="list-row cat" data-act="edit-cat" data-id="${c.id}" ${col(c.color)}>
        <span class="dot"></span>
        <span class="label">
          <span class="title">${esc(c.name)}</span>
          <span class="sub">${c.budget ? `${money(s)} of ${money(c.budget)}` : s ? "spent · no budget yet" : "no budget yet"}</span>
          ${c.budget ? `<span class="mini"><i class="${l < 0 ? "bad" : ""}" style="width:${Math.min(100, (s / c.budget) * 100)}%"></i></span>` : ""}
        </span>
        ${right}
      </button>`;
  }).join("");
  const orphan = Object.keys(byCat).filter((id) => !b.categories.some((c) => c.id === id));
  const orphanRow = orphan.length ? `<div class="list-row"><span class="dot"></span><span class="label"><span class="title">Uncategorised</span></span><span class="amt muted">${money(sum(orphan, (id) => byCat[id]))}</span></div>` : "";

  // group spending by day
  const days = {};
  for (const e of exps) (days[e.date] = days[e.date] || []).push(e);
  const list = Object.entries(days).map(([d, es]) => `
    <div class="day-head"><span>${d === todayKey() ? "Today" : fmtLong(d)}</span><span>${money(sum(es, (e) => e.amount))}</span></div>
    ${es.map((e) => {
      const c = catOf(e.catId);
      return `<button class="list-row exp" data-act="edit-exp" data-id="${e.id}" ${col(c.color)}>
        <span class="dot"></span>
        <span class="label"><span class="title">${esc(e.note || c.name)}</span>${e.note ? `<span class="sub">${esc(c.name)}</span>` : ""}</span>
        <span class="amt">${money(e.amount)}</span>
      </button>`;
    }).join("")}`).join("");

  // savings: last 6 months
  const savedNow = Number(state.money.saved[nowMk] || 0);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(nowMk, i - 5));
  const maxV = Math.max(target, ...months.map((m) => Number(state.money.saved[m] || 0)), 1);
  const bars = months.map((m) => {
    const v = Number(state.money.saved[m] || 0);
    return `<div><i class="${target && v < target ? "miss" : ""}" style="height:${(v / maxV) * 70}px"></i>${monthLabel(m, { month: "short" })}</div>`;
  }).join("");

  return `
    <div class="head-row">
      <div>
        <p class="eyebrow">${isThis ? "This month" : "Looking back"}</p>
        <h1>${monthLabel(mk, { month: "long", year: "numeric" })}</h1>
        ${isThis ? "" : `<button class="today-link" data-act="this-month">Back to this month</button>`}
      </div>
      <div class="date-nav">
        <button class="icon-btn" data-act="month" data-n="-1" aria-label="Previous month">‹</button>
        <button class="icon-btn" data-act="month" data-n="1" aria-label="Next month" ${isThis ? "disabled" : ""}>›</button>
      </div>
    </div>

    <div style="margin-top:14px">${hero}</div>

    <h2>Where it's going <small>tap to set a budget</small></h2>
    <div class="card">
      ${cats}${orphanRow}
      <button class="add-row" data-act="add-cat">+ Add a category</button>
    </div>

    <h2>Income &amp; plan</h2>
    <div class="card">
      <button class="list-row" data-act="edit-income" ${col("money")}>
        <span class="label">
          <span class="title">${b.income ? `${money(b.income)} income a month` : "Add your monthly income"}</span>
          <span class="sub">${b.income ? `Save ${money(target)} · budgeted ${money(budgeted)} · ${b.income - target - budgeted >= 0 ? `${money(b.income - target - budgeted)} not given a job yet` : `${money(budgeted + target - b.income)} more planned than you earn`}` : "So the app can tell you what's free to plan"}</span>
        </span>${chev}
      </button>
    </div>

    <h2>Spending <small>${exps.length} item${exps.length === 1 ? "" : "s"}</small></h2>
    <div class="card">
      ${list || `<div class="empty">Nothing added for ${monthLabel(mk)} yet. Tap <b>+</b> each time you spend.</div>`}
    </div>

    <h2>Savings <small>${monthLabel(nowMk)}</small></h2>
    <div class="card pad" ${col("money")}>
      <div class="big-num">${money(savedNow)}</div>
      <div class="note" style="margin:4px 0 0">saved this month${target ? ` of ${money(target)} goal` : ""}</div>
      ${target ? `<div class="meter"><i style="width:${Math.min(100, (savedNow / target) * 100)}%"></i></div>` : ""}
      <div class="row">
        <label class="field"><span>Saved this month</span><input type="number" inputmode="numeric" min="0" data-bind="saved" value="${savedNow || ""}" placeholder="₹0"></label>
        <label class="field"><span>Monthly goal</span><input type="number" inputmode="numeric" min="0" data-bind="target" value="${target || ""}" placeholder="₹0"></label>
      </div>
      <div class="bars">${bars}</div>
      <p class="note">Tip: set an auto-transfer for salary day, then just note the amount here.</p>
    </div>

    <button class="fab" data-act="add-exp" aria-label="Add spending">+</button>
  `;
}

function renderPlan() {
  const g = state.goals;
  const open = g.filter((x) => !x.done).length;
  const h = state.house;
  const daysLeft = h.moveBy ? Math.round((parse(h.moveBy) - parse(todayKey())) / 86400000) : null;
  const places = [...h.places].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const sortedGoals = [...g].sort((a, b) => a.done - b.done);

  return `
    <p class="eyebrow">One-time things</p>
    <h1>The bigger plan</h1>
    <p class="note">${open ? `<strong>${open} still open.</strong> Do these first — each one makes every day easier.` : "Everything here is done. Add the next one."}</p>

    <h2>To decide &amp; set up</h2>
    <div class="card">
      ${sortedGoals.map((x) => `<div class="check${x.done ? " done" : ""}" ${col(x.area)}>
          <button class="box" data-act="goal" data-id="${x.id}" aria-label="${x.done ? "Mark not done" : "Mark done"}">${tick}</button>
          <button class="label link" data-act="edit-goal" data-id="${x.id}">
            <span class="title">${esc(x.title)}</span>
            <span class="sub">${AREAS[x.area]}${x.doneAt ? ` · done ${fmtShort(x.doneAt)}` : ""}</span>
          </button>
        </div>`).join("") || `<div class="empty">Nothing yet.</div>`}
      <button class="add-row" data-act="add-goal">+ Add something to decide</button>
    </div>

    <h2>New house ${daysLeft !== null ? `<small>${daysLeft >= 0 ? `${daysLeft} days left` : `${-daysLeft} days past the date`}</small>` : ""}</h2>
    <div class="card pad" ${col("home")}>
      <div class="row">
        <label class="field"><span>Move by</span><input type="date" data-bind="moveBy" value="${esc(h.moveBy)}"></label>
        <label class="field"><span>Rent budget / month</span><input type="number" inputmode="numeric" min="0" data-bind="budget" value="${h.budget || ""}" placeholder="₹0"></label>
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
          <button class="place-head link" data-act="edit-place" data-id="${p.id}">
            <b>${esc(p.name)}</b><span>${p.rent ? money(p.rent) : ""}${h.budget && p.rent > h.budget ? " · over budget" : ""}</span>
          </button>
          ${p.notes ? `<p>${esc(p.notes)}</p>` : ""}
          <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button class="${n <= (p.rating || 0) ? "on" : ""}" data-act="rate" data-id="${p.id}" data-n="${n}" aria-label="${n} stars">★</button>`).join("")}</div>
        </div>`).join("") || `<div class="empty">No places yet. Add each one you visit and give it stars.</div>`}
      <button class="add-row" data-act="add-place">+ Add a place</button>
    </div>
  `;
}

function renderSettings() {
  const r = state.reminders;
  return `
    <p class="eyebrow">Setup</p>
    <h1>Shape your plan</h1>
    <p class="note">Tap anything to change it.</p>

    <h2>About you</h2>
    <div class="card">
      <button class="list-row" data-act="edit-name">
        <span class="label"><span class="title">${state.name ? esc(state.name) : "Add your name"}</span><span class="sub">Used for the greeting</span></span>${chev}
      </button>
    </div>

    <h2>Daily habits</h2>
    <div class="card">
      ${state.habits.map((h) => `<button class="list-row" data-act="edit-habit" data-id="${h.id}" ${col(h.area)}>
          <span class="dot"></span>
          <span class="label"><span class="title">${esc(h.title)}</span><span class="sub">${AREAS[h.area]} · ${daysLabel(h.days)}</span></span>${chev}
        </button>`).join("")}
      <button class="add-row" data-act="add-habit">+ Add a habit</button>
    </div>

    <h2>Weekly goals</h2>
    <div class="card">
      ${state.weekly.map((w) => `<button class="list-row" data-act="edit-weekly" data-id="${w.id}" ${col(w.area)}>
          <span class="dot"></span>
          <span class="label"><span class="title">${esc(w.title)}</span><span class="sub">${AREAS[w.area]} · ${w.target} time${w.target > 1 ? "s" : ""} a week</span></span>${chev}
        </button>`).join("")}
      <button class="add-row" data-act="add-weekly">+ Add a weekly goal</button>
    </div>

    <h2>Reminders</h2>
    <div class="card pad">
      <p class="note" style="margin-top:0">Adds repeating events with alerts to your iPhone Calendar, so your phone reminds you even when the app is closed.</p>
      <div class="row">
        <label class="field"><span>Workout</span><input type="time" data-bind="rem-workout" value="${r.workout}"></label>
        <label class="field"><span>Deep work</span><input type="time" data-bind="rem-deepwork" value="${r.deepwork}"></label>
        <label class="field"><span>Sunday review</span><input type="time" data-bind="rem-review" value="${r.review}"></label>
      </div>
      <div class="btn-row"><button class="btn" data-act="ics">Add to Calendar</button></div>
    </div>

    <h2>Backup</h2>
    <div class="card pad">
      <p class="note" style="margin-top:0">Your plan is saved only on this phone. Save a backup to Files once in a while.</p>
      <div class="btn-row">
        <button class="btn ghost" data-act="export">Save backup</button>
        <button class="btn ghost" data-act="import">Restore backup</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </div>
    </div>

    <h2>Help</h2>
    <div class="card">
      <button class="list-row" data-act="show-welcome"><span class="label"><span class="title">How Daily Plan works</span></span>${chev}</button>
      <button class="list-row" data-act="reset"><span class="label"><span class="title danger-text">Start over with the original plan</span></span></button>
    </div>
  `;
}

/* ---------- bottom sheet (all editing happens here) ---------- */

const sheetEl = document.getElementById("sheet");
let sheetSave = null;

function areaChips(selected) {
  return `<div class="chips" data-group="area">${Object.entries(AREAS).map(([k, v]) =>
    `<button type="button" class="chip${k === selected ? " on" : ""}" data-val="${k}" ${col(k)}>${v}</button>`).join("")}</div>`;
}

function openSheet({ title, body, saveLabel = "Save", onSave, onDelete }) {
  sheetEl.innerHTML = `
    <div class="sheet-backdrop" data-sheet="close"></div>
    <form class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="grab"></div>
      <div class="sheet-head">
        <button type="button" class="today-link" data-sheet="close">Cancel</button>
        <strong>${esc(title)}</strong>
        <button type="submit" class="save-link">${esc(saveLabel)}</button>
      </div>
      <div class="sheet-body">${body}
        ${onDelete ? `<button type="button" class="btn danger wide" data-sheet="delete">Delete</button>` : ""}
      </div>
    </form>`;
  sheetSave = onSave;
  sheetEl._onDelete = onDelete;
  sheetEl.classList.add("open");
  document.body.classList.add("locked");
  const first = sheetEl.querySelector("input[autofocus]");
  if (first && !isIOS) setTimeout(() => first.focus(), 250);
}

function closeSheet() {
  sheetEl.classList.remove("open");
  document.body.classList.remove("locked");
  sheetSave = null;
  setTimeout(() => { if (!sheetEl.classList.contains("open")) sheetEl.innerHTML = ""; }, 260);
}

sheetEl.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) {
    chip.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === chip));
    return;
  }
  const day = e.target.closest("[data-day]");
  if (day) { day.classList.toggle("on"); return; }
  const preset = e.target.closest("[data-preset]");
  if (preset) {
    const set = preset.dataset.preset.split(",").map(Number);
    sheetEl.querySelectorAll("[data-day]").forEach((b) => b.classList.toggle("on", set.includes(+b.dataset.day)));
    return;
  }
  const stepBtn = e.target.closest("[data-step]");
  if (stepBtn) {
    const input = sheetEl.querySelector("#f-target");
    input.value = Math.max(1, Math.min(14, (+input.value || 1) + +stepBtn.dataset.step));
    return;
  }
  const act = e.target.closest("[data-sheet]");
  if (!act) return;
  if (act.dataset.sheet === "close") closeSheet();
  if (act.dataset.sheet === "delete") { const del = sheetEl._onDelete; closeSheet(); del(); save(); render(true); }
});

sheetEl.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!sheetSave) return;
  const f = (id) => sheetEl.querySelector(id);
  const area = (sheetEl.querySelector('[data-group="area"] .chip.on') || {}).dataset?.val;
  const days = [...sheetEl.querySelectorAll("[data-day].on")].map((b) => +b.dataset.day);
  if (sheetSave({ f, area, days }) === false) return;
  closeSheet();
  save();
  render(true);
});

function habitSheet(h) {
  const isNew = !h;
  h = h || { area: "work", title: "", note: "", days: ALL_DAYS.slice() };
  openSheet({
    title: isNew ? "New habit" : "Edit habit",
    saveLabel: isNew ? "Add" : "Save",
    body: `
      <label class="field"><span>What do you want to do?</span><input type="text" id="f-title" value="${esc(h.title)}" placeholder="e.g. Stretch for 10 min" autofocus></label>
      <label class="field"><span>Small note (optional)</span><input type="text" id="f-note" value="${esc(h.note)}" placeholder="e.g. After brushing teeth"></label>
      <div class="field"><span>Area</span>${areaChips(h.area)}</div>
      <div class="field"><span>Which days?</span>
        <div class="presets">
          <button type="button" data-preset="${ALL_DAYS}">Every day</button>
          <button type="button" data-preset="${WEEKDAYS}">Weekdays</button>
          <button type="button" data-preset="0,6">Weekends</button>
        </div>
        <div class="daypick">${WEEK_ORDER.map((d) => `<button type="button" class="${h.days.includes(d) ? "on" : ""}" data-day="${d}">${DAY_NAMES[d]}</button>`).join("")}</div>
      </div>`,
    onSave({ f, area, days }) {
      const title = f("#f-title").value.trim();
      if (!title) { toast("Give it a name first"); return false; }
      if (!days.length) { toast("Pick at least one day"); return false; }
      const data = { title, note: f("#f-note").value.trim(), area: area || "work", days: days.sort() };
      if (isNew) { state.habits.push({ id: uid(), ...data }); toast("Habit added"); }
      else Object.assign(h, data);
    },
    onDelete: isNew ? null : () => removeWithUndo(state.habits, h, "Habit deleted"),
  });
}

function weeklySheet(w) {
  const isNew = !w;
  w = w || { area: "dance", title: "", target: 1 };
  openSheet({
    title: isNew ? "New weekly goal" : "Edit weekly goal",
    saveLabel: isNew ? "Add" : "Save",
    body: `
      <label class="field"><span>Goal</span><input type="text" id="f-title" value="${esc(w.title)}" placeholder="e.g. Call home" autofocus></label>
      <div class="field"><span>Area</span>${areaChips(w.area)}</div>
      <div class="field"><span>How many times a week?</span>
        <div class="step big">
          <button type="button" data-step="-1" aria-label="Fewer">−</button>
          <input type="number" id="f-target" min="1" max="14" inputmode="numeric" value="${w.target}">
          <button type="button" data-step="1" aria-label="More">+</button>
        </div>
      </div>`,
    onSave({ f, area }) {
      const title = f("#f-title").value.trim();
      if (!title) { toast("Give it a name first"); return false; }
      const data = { title, area: area || "dance", target: Math.max(1, Math.min(14, +f("#f-target").value || 1)) };
      if (isNew) { state.weekly.push({ id: uid(), ...data }); toast("Weekly goal added"); }
      else Object.assign(w, data);
    },
    onDelete: isNew ? null : () => removeWithUndo(state.weekly, w, "Weekly goal deleted"),
  });
}

function goalSheet(g) {
  const isNew = !g;
  g = g || { area: "home", title: "" };
  openSheet({
    title: isNew ? "Something to decide" : "Edit",
    saveLabel: isNew ? "Add" : "Save",
    body: `
      <label class="field"><span>What needs deciding or setting up?</span><input type="text" id="f-title" value="${esc(g.title)}" placeholder="e.g. Book a swimming pool membership" autofocus></label>
      <div class="field"><span>Area</span>${areaChips(g.area)}</div>`,
    onSave({ f, area }) {
      const title = f("#f-title").value.trim();
      if (!title) { toast("Write what it is first"); return false; }
      if (isNew) state.goals.push({ id: uid(), area: area || "home", title, done: false });
      else Object.assign(g, { title, area: area || g.area });
    },
    onDelete: isNew ? null : () => removeWithUndo(state.goals, g, "Deleted"),
  });
}

function placeSheet(p) {
  const isNew = !p;
  p = p || { name: "", rent: "", notes: "" };
  openSheet({
    title: isNew ? "Add a place" : "Edit place",
    saveLabel: isNew ? "Add" : "Save",
    body: `
      <label class="field"><span>Area or building</span><input type="text" id="f-name" value="${esc(p.name)}" placeholder="e.g. 2BHK near the dance studio" autofocus></label>
      <label class="field"><span>Rent per month</span><input type="number" id="f-rent" inputmode="numeric" value="${p.rent || ""}" placeholder="₹"></label>
      <label class="field"><span>Notes</span><textarea id="f-notes" rows="3" placeholder="Commute, kitchen, light, owner…">${esc(p.notes)}</textarea></label>`,
    onSave({ f }) {
      const name = f("#f-name").value.trim();
      if (!name) { toast("Add a name for the place"); return false; }
      const data = { name, rent: +f("#f-rent").value || 0, notes: f("#f-notes").value.trim() };
      if (isNew) state.house.places.push({ id: uid(), rating: 0, ...data });
      else Object.assign(p, data);
    },
    onDelete: isNew ? null : () => removeWithUndo(state.house.places, p, "Place deleted"),
  });
}

function catChips(selectedId) {
  return `<div class="chips" data-group="area">${state.budget.categories.map((c) =>
    `<button type="button" class="chip${c.id === selectedId ? " on" : ""}" data-val="${c.id}" ${col(c.color)}>${esc(c.name)}</button>`).join("")}</div>`;
}

function expenseSheet(e, dateKey) {
  const isNew = !e;
  const last = state.budget.expenses[state.budget.expenses.length - 1];
  e = e || { amount: "", catId: (last && last.catId) || (state.budget.categories[0] || {}).id, note: "", date: dateKey || todayKey() };
  openSheet({
    title: isNew ? "Add spending" : "Edit spending",
    saveLabel: isNew ? "Add" : "Save",
    body: `
      <label class="field amount"><span>How much?</span>
        <div class="amount-box"><b>₹</b><input type="number" id="f-amount" inputmode="decimal" min="0" step="any" value="${e.amount}" placeholder="0" autofocus></div>
      </label>
      <div class="field"><span>On what?</span>${catChips(e.catId)}</div>
      <label class="field"><span>Note (optional)</span><input type="text" id="f-note" value="${esc(e.note)}" placeholder="e.g. Vegetables, auto to class"></label>
      <label class="field"><span>Date</span><input type="date" id="f-date" value="${e.date}" max="${todayKey()}"></label>`,
    onSave({ f, area }) {
      const amount = Math.round(Number(f("#f-amount").value) * 100) / 100;
      if (!(amount > 0)) { toast("Type the amount first"); return false; }
      if (!area) { toast("Pick what it was for"); return false; }
      const data = { amount, catId: area, note: f("#f-note").value.trim(), date: f("#f-date").value || todayKey() };
      if (isNew) {
        state.budget.expenses.push({ id: uid(), ...data });
        const c = catOf(area);
        const left = c.budget - sum(monthExpenses(data.date.slice(0, 7)).filter((x) => x.catId === area), (x) => x.amount);
        toast(c.budget ? (left >= 0 ? `${money(left)} left for ${c.name}` : `${c.name} is ${money(-left)} over`) : "Added");
      } else Object.assign(e, data);
    },
    onDelete: isNew ? null : () => removeWithUndo(state.budget.expenses, e, "Spending deleted"),
  });
}

const CAT_COLORS = ["food", "workout", "work", "dance", "money", "outings", "home"];

function categorySheet(c) {
  const isNew = !c;
  c = c || { name: "", budget: 0, color: CAT_COLORS[state.budget.categories.length % CAT_COLORS.length] };
  const spentNow = isNew ? 0 : sum(monthExpenses(monthKey(new Date())).filter((x) => x.catId === c.id), (x) => x.amount);
  openSheet({
    title: isNew ? "New category" : c.name,
    saveLabel: isNew ? "Add" : "Save",
    body: `
      <label class="field"><span>Name</span><input type="text" id="f-name" value="${esc(c.name)}" placeholder="e.g. Gifts" ${isNew ? "autofocus" : ""}></label>
      <label class="field amount"><span>Budget for a month</span>
        <div class="amount-box"><b>₹</b><input type="number" id="f-budget" inputmode="numeric" min="0" value="${c.budget || ""}" placeholder="0" ${isNew ? "" : "autofocus"}></div>
      </label>
      ${isNew ? "" : `<p class="note">Spent ${money(spentNow)} on this so far in ${monthLabel(monthKey(new Date()))}.</p>`}`,
    onSave({ f }) {
      const name = f("#f-name").value.trim();
      if (!name) { toast("Give it a name first"); return false; }
      const data = { name, budget: Math.max(0, Number(f("#f-budget").value) || 0) };
      if (isNew) state.budget.categories.push({ id: uid(), color: c.color, ...data });
      else Object.assign(c, data);
    },
    onDelete: isNew ? null : () => removeWithUndo(state.budget.categories, c, "Category deleted"),
  });
}

function incomeSheet() {
  openSheet({
    title: "Monthly plan",
    body: `
      <label class="field amount"><span>Money coming in each month</span>
        <div class="amount-box"><b>₹</b><input type="number" id="f-income" inputmode="numeric" min="0" value="${state.budget.income || ""}" placeholder="0" autofocus></div>
      </label>
      <label class="field amount"><span>Put aside for savings first</span>
        <div class="amount-box"><b>₹</b><input type="number" id="f-save" inputmode="numeric" min="0" value="${state.money.target || ""}" placeholder="0"></div>
      </label>
      <p class="note">Then give each category a budget on the Money screen. Whatever isn't given a job shows up so you can decide where it goes.</p>`,
    onSave({ f }) {
      state.budget.income = Math.max(0, Number(f("#f-income").value) || 0);
      state.money.target = Math.max(0, Number(f("#f-save").value) || 0);
    },
  });
}

function nameSheet() {
  openSheet({
    title: "Your name",
    body: `<label class="field"><span>What should the app call you?</span><input type="text" id="f-name" value="${esc(state.name)}" placeholder="Your name" autocomplete="given-name" autofocus></label>`,
    onSave({ f }) { state.name = f("#f-name").value.trim(); },
  });
}

function removeWithUndo(arr, item, msg) {
  const i = arr.indexOf(item);
  if (i < 0) return;
  arr.splice(i, 1);
  toast(msg, () => { arr.splice(i, 0, item); save(); render(true); });
}

/* ---------- welcome ---------- */

function showWelcome() {
  const el = document.getElementById("welcome");
  el.innerHTML = `
    <div class="welcome-inner">
      <svg class="bulb" viewBox="0 0 48 48" aria-hidden="true"><path d="M18 36h12M20 41h8M24 6a13 13 0 0 0-7.6 23.6c1.3 1 2.1 2.6 2.1 4.4h11c0-1.8.8-3.4 2.1-4.4A13 13 0 0 0 24 6z"/><path d="M24 1v2M8 8l1.5 1.5M40 8l-1.5 1.5M3 22h2M43 22h2"/></svg>
      <h1>Your plan<br>for every day</h1>
      <ol class="how">
        <li><b>Today</b><span>Tick small things off as you do them. Miss one? Swipe back and fill it in.</span></li>
        <li><b>Week</b><span>Dance video, swim, an outing — tap + when it happens.</span></li>
        <li><b>Money</b><span>Add what you spend. See what's left for rent, food, dance and the rest.</span></li>
        <li><b>Plan</b><span>The one-time decisions and the new house.</span></li>
        <li><b>Setup</b><span>Change anything. It's your plan.</span></li>
      </ol>
      <label class="field"><span>What should I call you?</span><input type="text" id="welcome-name" value="${esc(state.name)}" placeholder="Your name (optional)" autocomplete="given-name"></label>
      <button class="btn wide" id="welcome-go">Let's start</button>
      <p class="note center">Everything stays on this phone. No account.</p>
    </div>`;
  el.classList.add("open");
  document.getElementById("welcome-go").onclick = () => {
    state.name = document.getElementById("welcome-name").value.trim();
    state.welcomed = true;
    save();
    el.classList.remove("open");
    render(false);
  };
}

/* ---------- render + routing ---------- */

const screens = { today: renderToday, week: renderWeek, money: renderMoney, plan: renderPlan, settings: renderSettings };
const screenEl = document.getElementById("screen");

function render(keepScroll) {
  const y = window.scrollY;
  screenEl.innerHTML = screens[ui.tab]();
  document.querySelectorAll(".tabbar button").forEach((b) => {
    const on = b.dataset.tab === ui.tab;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  if (keepScroll) { screenEl.style.animation = "none"; window.scrollTo(0, y); }
  else { screenEl.style.animation = ""; void screenEl.offsetWidth; window.scrollTo(0, 0); }
}

function go(tab) {
  ui.tab = tab;
  if (tab === "today") ui.date = todayKey();
  if (tab === "week") ui.week = weekKey(new Date());
  if (tab === "money") ui.month = monthKey(new Date());
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
    if (dayPct(ui.date) === 1 && day[b.dataset.id]) toast("Whole plan done. Well done!");
  },
  day(b) { const next = addDays(ui.date, +b.dataset.n); if (next <= todayKey()) ui.date = next; return "top"; },
  "goto-today"() { ui.date = todayKey(); return "top"; },
  week(b) { ui.week = addDays(ui.week, +b.dataset.n); return "top"; },
  "this-week"() { ui.week = weekKey(new Date()); return "top"; },
  "open-day"(b) { ui.tab = "today"; ui.date = b.dataset.date; return "top"; },
  wk(b) {
    const log = (state.weekLog[b.dataset.wk] = state.weekLog[b.dataset.wk] || {});
    log[b.dataset.id] = Math.max(0, (log[b.dataset.id] || 0) + +b.dataset.n);
    const w = find(state.weekly, b.dataset.id);
    if (+b.dataset.n > 0 && log[b.dataset.id] === w.target) toast(`${w.title} — done for the week!`);
  },
  goal(b) {
    const g = find(state.goals, b.dataset.id);
    g.done = !g.done;
    g.doneAt = g.done ? todayKey() : undefined;
    if (g.done) toast("Ticked off. One less thing to think about.");
  },
  "edit-goal"(b) { goalSheet(find(state.goals, b.dataset.id)); return "noop"; },
  "add-goal"() { goalSheet(); return "noop"; },
  crit(b) { const c = find(state.house.criteria, b.dataset.id); c.done = !c.done; },
  rate(b) { const p = find(state.house.places, b.dataset.id); p.rating = p.rating === +b.dataset.n ? 0 : +b.dataset.n; },
  "edit-place"(b) { placeSheet(find(state.house.places, b.dataset.id)); return "noop"; },
  "add-place"() { placeSheet(); return "noop"; },
  "edit-habit"(b) { habitSheet(find(state.habits, b.dataset.id)); return "noop"; },
  "add-habit"() { habitSheet(); return "noop"; },
  "edit-weekly"(b) { weeklySheet(find(state.weekly, b.dataset.id)); return "noop"; },
  "add-weekly"() { weeklySheet(); return "noop"; },
  "edit-name"() { nameSheet(); return "noop"; },
  "add-exp"(b) { expenseSheet(null, b.dataset.date); return "noop"; },
  "edit-exp"(b) { expenseSheet(find(state.budget.expenses, b.dataset.id)); return "noop"; },
  "edit-cat"(b) { categorySheet(find(state.budget.categories, b.dataset.id)); return "noop"; },
  "add-cat"() { categorySheet(); return "noop"; },
  "edit-income"() { incomeSheet(); return "noop"; },
  "go-money"() { ui.tab = "money"; ui.month = monthKey(new Date()); return "top"; },
  month(b) { ui.month = addMonths(ui.month, +b.dataset.n); return "top"; },
  "this-month"() { ui.month = monthKey(new Date()); return "top"; },
  "hide-hint"() { state.installHintHidden = true; },
  "show-welcome"() { showWelcome(); return "noop"; },
  ics() { downloadIcs(); return "noop"; },
  export() { exportBackup(); return "noop"; },
  import() { document.getElementById("import-file").click(); return "noop"; },
  reset() {
    openSheet({
      title: "Start over?",
      saveLabel: "Start over",
      body: `<p class="note" style="margin-top:0">This puts back the original plan. All ticks, savings and places will be cleared. Save a backup first if you might want them.</p>`,
      onSave() { const name = state.name; state = seed(); state.name = name; state.welcomed = true; toast("Fresh start"); },
    });
    return "noop";
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

// inline number / date / time fields — saved on change so typing never loses focus
screenEl.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "import-file") return importBackup(el.files[0]);
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

// swipe left / right on Today to move between days
let touch = null;
screenEl.addEventListener("touchstart", (e) => {
  if (ui.tab !== "today" || e.touches.length !== 1) return;
  touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
screenEl.addEventListener("touchend", (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) < 70 || Math.abs(dy) > 50) return;
  const next = addDays(ui.date, dx > 0 ? -1 : 1);
  if (next > todayKey()) return;
  ui.date = next;
  render(false);
}, { passive: true });

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

/* ---------- toast (with optional Undo) ---------- */

let toastTimer;
function toast(msg, undo) {
  const t = document.getElementById("toast");
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button">Undo</button>` : ""}`;
  if (undo) t.querySelector("button").onclick = () => { undo(); t.classList.remove("show"); };
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), undo ? 5000 : 2200);
}

/* ---------- start ---------- */

// a new day while the app sat open in the background → jump to it
let lastToday = todayKey();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const now = todayKey();
  if (now !== lastToday && ui.tab === "today" && ui.date === lastToday) { ui.date = now; render(false); }
  lastToday = now;
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheetEl.classList.contains("open")) closeSheet(); });

try { const t = localStorage.getItem("dailyplan.tab"); if (t && screens[t]) ui.tab = t; } catch (e) {}
save();
render(false);
if (!state.welcomed) showWelcome();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
