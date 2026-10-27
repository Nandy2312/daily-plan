// Calendar maths and the links between the calendar and each area.
import { addDays, daysBetween, dow, fromMin, monthKey, nowMin, todayKey, toMin, weekDays, weekStart } from "./dates";
import type { Cat, Ev, Repeat, State } from "./model";

export interface Template { kind: string; title: string; cat: Cat; mins: number; at: string; repeat?: Repeat }

export const TEMPLATES: Template[] = [
  { kind: "strength", title: "Strength training", cat: "workout", mins: 30, at: "07:00" },
  { kind: "home-workout", title: "Home workout", cat: "workout", mins: 20, at: "07:00" },
  { kind: "swim", title: "Swimming", cat: "workout", mins: 60, at: "08:00" },
  { kind: "run", title: "Running", cat: "workout", mins: 30, at: "06:30" },
  { kind: "cook", title: "Cooking / meal prep", cat: "food", mins: 60, at: "10:00" },
  { kind: "deepwork", title: "Deep work · creating apps", cat: "work", mins: 90, at: "10:00" },
  { kind: "learning", title: "Learning new topics", cat: "work", mins: 60, at: "17:00" },
  { kind: "portfolio", title: "Portfolio update", cat: "work", mins: 60, at: "15:00" },
  { kind: "dance", title: "Dance practice", cat: "dance", mins: 60, at: "19:00" },
  { kind: "outing", title: "Weekly outing", cat: "outings", mins: 180, at: "17:00" },
  { kind: "home", title: "Home rental tasks", cat: "home", mins: 30, at: "18:00" },
  { kind: "review", title: "Money check-in", cat: "money", mins: 20, at: "19:00" },
];

export const REPEATS: { id: Repeat; label: (date: string) => string }[] = [
  { id: "none", label: () => "Once" },
  { id: "daily", label: () => "Every day" },
  { id: "weekdays", label: () => "Weekdays" },
  { id: "weekends", label: () => "Weekends" },
  { id: "weekly", label: (d) => `Every ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dow(d)]}` },
];

export interface Occ { ev: Ev; date: string; start: string; end: string; key: string; done: boolean }

export function occursOn(ev: Ev, date: string) {
  if (date < ev.date) return false;
  if (ev.skip && ev.skip.includes(date)) return false;
  const d = dow(date);
  switch (ev.repeat) {
    case "none": return date === ev.date;
    case "daily": return true;
    case "weekdays": return d >= 1 && d <= 5;
    case "weekends": return d === 0 || d === 6;
    case "weekly": return d === dow(ev.date);
  }
}

export function occurrences(s: State, date: string): Occ[] {
  return s.events
    .filter((ev) => occursOn(ev, date))
    .map((ev) => ({ ev, date, start: ev.start, end: ev.end, key: `${ev.id}@${date}`, done: !!s.done[`${ev.id}@${date}`] }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.ev.title.localeCompare(b.ev.title));
}

export function occurrencesRange(s: State, from: string, days: number): Occ[] {
  const out: Occ[] = [];
  for (let i = 0; i < days; i++) out.push(...occurrences(s, addDays(from, i)));
  return out;
}

// side-by-side columns for overlapping events in a time grid
export function layout(occs: Occ[]) {
  const items = occs.map((o) => ({ o, s: toMin(o.start), e: Math.max(toMin(o.end), toMin(o.start) + 20), col: 0, cols: 1 }));
  let group: typeof items = [];
  let groupEnd = -1;
  const flush = () => {
    const ends: number[] = [];
    for (const it of group) {
      let c = ends.findIndex((e) => e <= it.s);
      if (c < 0) { c = ends.length; ends.push(it.e); } else ends[c] = it.e;
      it.col = c;
    }
    for (const it of group) it.cols = ends.length;
    group = [];
  };
  for (const it of items) {
    if (it.s >= groupEnd && group.length) flush();
    group.push(it);
    groupEnd = Math.max(groupEnd, it.e);
  }
  flush();
  return items;
}

/* ---------- area status (calendar + section data feed the same ticks) ---------- */

export function sessions(s: State, from: string, to: string) {
  const manual = s.workouts.filter((w) => w.date >= from && w.date <= to).map((w) => ({ date: w.date, type: w.type, mins: w.mins, id: w.id, fromCal: false }));
  const cal: typeof manual = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const o of occurrences(s, d)) {
      if (o.done && o.ev.cat === "workout") cal.push({ date: d, type: o.ev.title, mins: toMin(o.end) - toMin(o.start), id: o.key, fromCal: true });
    }
  }
  return [...manual, ...cal].sort((a, b) => b.date.localeCompare(a.date));
}

export function dancePractices(s: State, from: string, to: string) {
  let n = s.dance.practices.filter((p) => p.date >= from && p.date <= to).length;
  for (let d = from; d <= to; d = addDays(d, 1)) n += occurrences(s, d).filter((o) => o.done && o.ev.cat === "dance").length;
  return n;
}

export function areaDone(s: State, date: string, cat: Cat): boolean {
  if (s.checks[date]?.[cat]) return true;
  if (occurrences(s, date).some((o) => o.done && o.ev.cat === cat)) return true;
  if (cat === "workout" && s.workouts.some((w) => w.date === date)) return true;
  if (cat === "dance" && s.dance.practices.some((p) => p.date === date)) return true;
  if (cat === "food") { const f = s.food[date]; if (f && f.meals.length >= 2) return true; }
  if (cat === "money" && s.money.expenses.some((e) => e.date === date)) return true;
  return false;
}

export function streak(s: State, cat: Cat) {
  let n = 0;
  let d = todayKey();
  if (!areaDone(s, d, cat)) d = addDays(d, -1);
  while (n < 400 && areaDone(s, d, cat)) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------- money ---------- */

export const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
export const monthExpenses = (s: State, mk: string) => s.money.expenses.filter((e) => e.date.startsWith(mk));
export function spendable(s: State) {
  const budgeted = sum(s.money.categories, (c) => c.budget);
  if (budgeted) return budgeted;
  return s.money.income ? Math.max(0, s.money.income - s.money.saveTarget) : 0;
}
export const moneyLeft = (s: State) => spendable(s) - sum(monthExpenses(s, monthKey(todayKey())), (e) => e.amount);
export const rupees = (n: number) => Number(n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/* ---------- light suggestions ---------- */

export interface Suggestion { key: string; text: string; tpl: Template; date: string; start: string }

export function suggestions(s: State): Suggestion[] {
  const today = todayKey();
  const wk = weekStart(today);
  const rest = weekDays(today).filter((d) => d >= today);
  const tomorrow = addDays(today, 1);
  const inWeek = (pred: (o: Occ) => boolean) => weekDays(today).some((d) => occurrences(s, d).some(pred));
  const nextSlot = (prefer: string[]) => prefer.find((d) => rest.includes(d)) || (rest[1] ?? tomorrow);
  const tpl = (k: string) => TEMPLATES.find((t) => t.kind === k)!;
  const out: Suggestion[] = [];
  const add = (rule: string, text: string, kind: string, date: string, start: string) => {
    const key = `${rule}@${wk}`;
    if (!s.dismissed[key]) out.push({ key, text, tpl: tpl(kind), date, start });
  };

  if (!inWeek((o) => o.ev.kind === "strength" || o.ev.kind === "home-workout"))
    add("strength", "You haven't planned strength training this week", "strength", tomorrow, "07:00");
  if (!inWeek((o) => o.ev.kind === "swim"))
    add("swim", "No swim planned this week", "swim", nextSlot([addDays(wk, 5), addDays(wk, 6)]), "08:00");
  if (!inWeek((o) => o.ev.cat === "outings"))
    add("outing", "No outing planned this week — you deserve one", "outing", nextSlot([addDays(wk, 5), addDays(wk, 6)]), "17:00");
  const danceN = weekDays(today).reduce((n, d) => n + occurrences(s, d).filter((o) => o.ev.cat === "dance").length, 0);
  if (danceN < s.dance.weeklyTarget)
    add("dance", `${danceN} of ${s.dance.weeklyTarget} dance practices planned this week`, "dance", tomorrow, "19:00");
  if (!inWeek((o) => o.ev.kind === "learning"))
    add("learning", "No learning time planned this week", "learning", tomorrow, "17:00");
  const moveIn = s.home.moveBy ? daysBetween(today, s.home.moveBy) : 99;
  if (moveIn >= 0 && moveIn <= 30 && !rest.some((d) => occurrences(s, d).some((o) => o.ev.cat === "home")))
    add("home", `Moving in ${moveIn} days — plan a home task`, "home", tomorrow, "18:00");
  return out;
}

/* ---------- what's on now / next ---------- */

export function nowNext(occs: Occ[]) {
  const m = nowMin();
  const now = occs.find((o) => toMin(o.start) <= m && m < toMin(o.end) && !o.done);
  const next = occs.find((o) => toMin(o.start) > m && !o.done);
  return { now, next };
}

export const endFrom = (start: string, mins: number) => fromMin(Math.min(toMin(start) + mins, 23 * 60 + 59));
