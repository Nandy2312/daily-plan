import { addDays, todayKey, uid, weekStart } from "./dates";

export type Cat = "food" | "workout" | "work" | "dance" | "money" | "outings" | "home";
export type Repeat = "none" | "daily" | "weekdays" | "weekends" | "weekly";

export const CATS: Record<Cat, { label: string }> = {
  food: { label: "Food" },
  workout: { label: "Workout" },
  work: { label: "Work" },
  dance: { label: "Dance" },
  money: { label: "Money" },
  outings: { label: "Outings" },
  home: { label: "Home" },
};
export const CAT_LIST = Object.keys(CATS) as Cat[];

export interface Ev {
  id: string;
  title: string;
  cat: Cat;
  kind?: string; // template kind, e.g. "strength", "swim"
  date: string; // first day
  start: string;
  end: string;
  repeat: Repeat;
  skip?: string[]; // dates removed from a repeating event
  note?: string;
}

export interface Meal { id: string; slot: string; text: string }
export interface FoodDay { meals: Meal[]; cook: "" | "self" | "akka"; energy: "" | "low" | "ok" | "good"; note: string }
export interface Workout { id: string; date: string; type: string; mins: number; note?: string }
export interface Task { id: string; type: "apps" | "learning" | "portfolio"; title: string; done: boolean; doneAt?: string }
export interface LogEntry { id: string; date: string; text: string }
export interface Idea { id: string; text: string; status: "idea" | "filmed" | "posted" }
export interface BudgetCat { id: string; name: string; color: Cat; budget: number }
export interface Expense { id: string; date: string; amount: number; catId: string; note: string }
export interface SaveGoal { id: string; name: string; target: number; saved: number }
export interface Check { id: string; title: string; done: boolean }
export interface Place { id: string; name: string; rent: number; notes: string; rating: number }

export interface State {
  v: 2;
  name: string;
  welcomed: boolean;
  startedOn: string;
  events: Ev[];
  done: Record<string, true>; // "eventId@date"
  checks: Record<string, Partial<Record<Cat, true>>>; // manual area ticks per day
  food: Record<string, FoodDay>;
  workouts: Workout[];
  timer: { type: string; startedAt: number; pausedAt?: number; pausedMs: number } | null;
  tasks: Task[];
  learnLog: LogEntry[];
  dance: { weeklyTarget: number; practices: { id: string; date: string; mins: number }[]; ideas: Idea[] };
  money: { income: number; saveTarget: number; saved: Record<string, number>; categories: BudgetCat[]; expenses: Expense[]; goals: SaveGoal[] };
  home: { moveBy: string; budget: number; tasks: Check[]; places: Place[] };
  dismissed: Record<string, true>;
  savedAt: number;
}

export const MEAL_SLOTS = ["Breakfast", "Lunch", "Snack", "Dinner"];
export const emptyFoodDay = (): FoodDay => ({ meals: [], cook: "", energy: "", note: "" });

/* ---------- starting plan ---------- */

export function seed(): State {
  const t = todayKey();
  const mon = weekStart(t);
  const ev = (title: string, cat: Cat, kind: string, date: string, start: string, end: string, repeat: Repeat): Ev =>
    ({ id: uid(), title, cat, kind, date, start, end, repeat });
  return {
    v: 2,
    name: "",
    welcomed: false,
    startedOn: t,
    events: [
      ev("Strength training", "workout", "strength", addDays(mon, 0), "07:00", "07:30", "weekly"),
      ev("Strength training", "workout", "strength", addDays(mon, 2), "07:00", "07:30", "weekly"),
      ev("Strength training", "workout", "strength", addDays(mon, 4), "07:00", "07:30", "weekly"),
      ev("Running", "workout", "run", addDays(mon, 1), "07:00", "07:30", "weekly"),
      ev("Running", "workout", "run", addDays(mon, 3), "07:00", "07:30", "weekly"),
      ev("Deep work · creating apps", "work", "deepwork", mon, "10:00", "11:30", "weekdays"),
      ev("Learning new topics", "work", "learning", mon, "17:00", "18:00", "weekdays"),
      ev("Dance practice", "dance", "dance", addDays(mon, 1), "19:00", "20:00", "weekly"),
      ev("Dance practice", "dance", "dance", addDays(mon, 4), "19:00", "20:00", "weekly"),
      ev("Swimming", "workout", "swim", addDays(mon, 5), "08:00", "09:00", "weekly"),
      ev("Meal prep for the week", "food", "cook", addDays(mon, 6), "10:00", "11:30", "weekly"),
      ev("Weekly review", "money", "review", addDays(mon, 6), "19:00", "19:20", "weekly"),
    ],
    done: {},
    checks: {},
    food: {},
    workouts: [],
    timer: null,
    tasks: [
      { id: uid(), type: "apps", title: "Pick the next app to build", done: false },
      { id: uid(), type: "learning", title: "Choose this month's learning topic", done: false },
      { id: uid(), type: "portfolio", title: "Write up DanceFlow", done: false },
      { id: uid(), type: "portfolio", title: "Write up Kiln", done: false },
    ],
    learnLog: [],
    dance: {
      weeklyTarget: 2,
      practices: [],
      ideas: [{ id: uid(), text: "Short practice clip of a new routine", status: "idea" }],
    },
    money: {
      income: 0,
      saveTarget: 0,
      saved: {},
      categories: [
        ["Rent", "home"], ["Food & groceries", "food"], ["Cook akka", "food"], ["Transport", "outings"],
        ["Bills & phone", "work"], ["Dance", "dance"], ["Outings", "outings"], ["Shopping", "money"],
        ["Health & gym", "workout"], ["Other", "home"],
      ].map(([name, color]) => ({ id: uid(), name, color: color as Cat, budget: 0 })),
      expenses: [],
      goals: [{ id: uid(), name: "Emergency fund", target: 0, saved: 0 }],
    },
    home: {
      moveBy: addDays(t, 30),
      budget: 0,
      tasks: [
        "Decide the areas to look in", "Shortlist 3 places", "Visit and compare", "Give notice to the current owner",
        "Book packers / movers", "Move internet, gas and electricity", "Update address everywhere",
      ].map((title) => ({ id: uid(), title, done: false })),
      places: [],
    },
    dismissed: {},
    savedAt: 0,
  };
}

/* ---------- bring over data from the first version (dailyplan.v1) ---------- */

export function migrateV1(s: State): State {
  try {
    const raw = localStorage.getItem("dailyplan.v1");
    if (!raw) return s;
    const v1 = JSON.parse(raw);
    if (v1.name) s.name = v1.name;
    if (v1.budget) {
      if (v1.budget.income) s.money.income = v1.budget.income;
      if (Array.isArray(v1.budget.categories)) s.money.categories = v1.budget.categories;
      if (Array.isArray(v1.budget.expenses)) s.money.expenses = v1.budget.expenses;
    }
    if (v1.money) {
      s.money.saveTarget = Number(v1.money.target) || 0;
      s.money.saved = v1.money.saved || {};
    }
    if (v1.house) {
      if (v1.house.moveBy) s.home.moveBy = v1.house.moveBy;
      s.home.budget = Number(v1.house.budget) || 0;
      if (Array.isArray(v1.house.places)) s.home.places = v1.house.places;
    }
    if (Array.isArray(v1.goals)) {
      for (const g of v1.goals) {
        if (g.done) continue;
        const type = g.area === "work" ? "portfolio" : null;
        if (type && !s.tasks.some((t) => t.title === g.title)) s.tasks.push({ id: uid(), type, title: g.title, done: false });
        if (g.area === "home") s.home.tasks.unshift({ id: uid(), title: g.title, done: false });
      }
    }
    localStorage.setItem("dailyplan.v1.migrated", raw);
    localStorage.removeItem("dailyplan.v1");
  } catch (e) {
    /* keep the fresh plan */
  }
  return s;
}
