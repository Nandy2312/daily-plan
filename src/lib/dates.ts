// Dates are local "YYYY-MM-DD" strings and times are "HH:MM" — no timezone surprises.

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayKey = () => ymd(new Date());
export const addDays = (key: string, n: number) => {
  const d = parse(key);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const dow = (key: string) => parse(key).getDay();
export const weekStart = (key: string) => addDays(key, -((dow(key) + 6) % 7)); // Monday
export const weekDays = (key: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(key), i));
export const monthKey = (key: string) => key.slice(0, 7);
export const addMonths = (mk: string, n: number) => {
  const d = new Date(+mk.slice(0, 4), +mk.slice(5) - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const fromMin = (n: number) => {
  const c = Math.max(0, Math.min(24 * 60 - 1, Math.round(n)));
  return `${pad(Math.floor(c / 60))}:${pad(c % 60)}`;
};
export const nowMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const fmtDay = (key: string, o: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "short" }) =>
  parse(key).toLocaleDateString(undefined, o);
export const fmtShort = (key: string) => fmtDay(key, { day: "numeric", month: "short" });
export const fmtMonth = (mk: string, o: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }) =>
  new Date(+mk.slice(0, 4), +mk.slice(5) - 1, 1).toLocaleDateString(undefined, o);
export const fmtTime = (t: string) => {
  const m = toMin(t);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 || 12;
  return `${h12}${mm ? ":" + pad(mm) : ""}${h < 12 ? "am" : "pm"}`;
};
export const relDay = (key: string) => {
  const d = daysBetween(todayKey(), key);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d > 1 && d < 7) return DAY_LONG[dow(key)];
  return fmtShort(key);
};

export const uid = () => Math.random().toString(36).slice(2, 10);
