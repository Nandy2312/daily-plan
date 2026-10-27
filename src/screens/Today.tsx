import { useNav } from "../App";
import { addDays, daysBetween, fmtDay, fmtTime, monthKey, todayKey, weekDays } from "../lib/dates";
import { CAT_LIST, CATS, Cat, State } from "../lib/model";
import { areaDone, dancePractices, monthExpenses, moneyLeft, nowNext, occurrences, rupees, sessions, spendable, streak, suggestions, sum } from "../lib/plan";
import { useStore } from "../lib/store";
import { catStyle, Icon, Ring, Tick, useToast } from "../ui/kit";

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

// one short line per area for the dashboard tiles
export function areaLine(s: State, cat: Cat): string {
  const t = todayKey();
  const week = weekDays(t);
  switch (cat) {
    case "food": {
      const f = s.food[t];
      const who = f?.cook === "akka" ? "Cook akka" : f?.cook === "self" ? "Cooking myself" : "";
      const n = f?.meals.length || 0;
      return [who, n ? `${n} meal${n > 1 ? "s" : ""}` : "Plan meals"].filter(Boolean).join(" · ");
    }
    case "workout": {
      const st = streak(s, "workout");
      const n = sessions(s, week[0], week[6]).length;
      return st > 1 ? `${st}-day streak` : `${n} this week`;
    }
    case "work": {
      const open = s.tasks.filter((x) => !x.done).length;
      return open ? `${open} task${open > 1 ? "s" : ""} open` : "All tasks done";
    }
    case "dance": return `${dancePractices(s, week[0], week[6])} of ${s.dance.weeklyTarget} practices`;
    case "money": {
      if (!spendable(s)) return `${rupees(sum(monthExpenses(s, monthKey(t)), (e) => e.amount))} spent`;
      const l = moneyLeft(s);
      return l >= 0 ? `${rupees(l)} left` : `${rupees(-l)} over`;
    }
    case "outings": {
      const next = week.filter((d) => d >= t).flatMap((d) => occurrences(s, d)).find((o) => o.ev.cat === "outings");
      return next ? `${fmtDay(next.date, { weekday: "short" })} · ${next.ev.title}` : "Plan one this week";
    }
    case "home": {
      if (!s.home.moveBy) return "Set a move date";
      const d = daysBetween(t, s.home.moveBy);
      return d >= 0 ? `${d} days to move` : "Move date passed";
    }
  }
}

export function Today() {
  const { s, update } = useStore();
  const nav = useNav();
  const toast = useToast();
  const t = todayKey();
  const occs = occurrences(s, t);
  const done = occs.filter((o) => o.done).length;
  const { now, next } = nowNext(occs);
  const sugg = suggestions(s)[0];
  const areasDone = CAT_LIST.filter((c) => areaDone(s, t, c)).length;
  const tomorrow = occurrences(s, addDays(t, 1));

  const toggle = (key: string, title: string) => {
    const was = !!s.done[key];
    update((d) => { if (was) delete d.done[key]; else d.done[key] = true; });
    if (!was && done + 1 === occs.length) toast("Everything on today's plan is done!");
    else if (!was) toast(`${title} — done`);
  };
  const tickArea = (c: Cat) => update((d) => {
    const day = (d.checks[t] = d.checks[t] || {});
    if (day[c]) delete day[c]; else day[c] = true;
  });

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">{greeting(s.name)}</p>
          <h1>{fmtDay(t)}</h1>
        </div>
      </header>

      <section className="hero-today card">
        <Ring value={occs.length ? done / occs.length : 0} size={76} />
        <div>
          <strong>{!occs.length ? "A free day" : done === occs.length ? "All done today" : `${occs.length - done} of ${occs.length} left today`}</strong>
          {now ? <span className="now" style={catStyle(now.ev.cat)}>Now · {now.ev.title}</span>
            : next ? <span className="muted">Next · {fmtTime(next.start)} {next.ev.title}</span>
            : <span className="muted">{areasDone} of 7 areas touched today</span>}
        </div>
      </section>

      {sugg && (
        <section className="suggest card">
          <Icon name="spark" size={20} />
          <p>{sugg.text}</p>
          <div className="suggest-actions">
            <button className="btn small" onClick={() => nav.addEvent({ date: sugg.date, start: sugg.start, cat: sugg.tpl.cat, kind: sugg.tpl.kind, title: sugg.tpl.title, mins: sugg.tpl.mins })}>Plan it</button>
            <button className="link muted" onClick={() => update((d) => { d.dismissed[sugg.key] = true; })}>Not now</button>
          </div>
        </section>
      )}

      <div className="section-head">
        <h2>Today's plan</h2>
        <button className="link" onClick={() => nav.showDay(t)}>Calendar</button>
      </div>
      <div className="card">
        {occs.map((o) => (
          <div key={o.key} className={`agenda${o.done ? " done" : ""}${o === now ? " is-now" : ""}`} style={catStyle(o.ev.cat)} onClick={() => nav.editEvent(o)}>
            <span className="agenda-time">{fmtTime(o.start)}</span>
            <span className="agenda-bar" />
            <span className="agenda-text"><b>{o.ev.title}</b><small>{CATS[o.ev.cat].label} · until {fmtTime(o.end)}</small></span>
            <Tick on={o.done} cat={o.ev.cat} label={`Mark ${o.ev.title} done`} onClick={() => toggle(o.key, o.ev.title)} />
          </div>
        ))}
        {!occs.length && <div className="empty">Nothing planned. Rest is part of the plan — or add something below.</div>}
        <button className="add-row" onClick={() => nav.addEvent({ date: t })}><Icon name="plus" size={18} /> Add to today</button>
      </div>

      <div className="section-head"><h2>Your areas</h2><small className="muted">tick when done · tap to open</small></div>
      <div className="area-grid">
        {CAT_LIST.map((c) => {
          const on = areaDone(s, t, c);
          return (
            <div key={c} className={`area-tile${on ? " on" : ""}`} style={catStyle(c)}>
              <button className="area-open" onClick={() => nav.openArea(c)}>
                <span className="area-icon"><Icon name={c} size={22} /></span>
                <b>{CATS[c].label}</b>
                <small>{areaLine(s, c)}</small>
              </button>
              <Tick on={on} cat={c} label={`${CATS[c].label} done today`} onClick={() => tickArea(c)} />
            </div>
          );
        })}
      </div>

      {tomorrow.length > 0 && (
        <>
          <div className="section-head"><h2>Tomorrow</h2><button className="link" onClick={() => nav.showDay(addDays(t, 1))}>See day</button></div>
          <div className="card soft">
            {tomorrow.slice(0, 4).map((o) => (
              <div key={o.key} className="mini-row" style={catStyle(o.ev.cat)}><i />{fmtTime(o.start)} · {o.ev.title}</div>
            ))}
            {tomorrow.length > 4 && <div className="mini-row muted">+{tomorrow.length - 4} more</div>}
          </div>
        </>
      )}

      <button className="fab" onClick={() => nav.addEvent({ date: t })} aria-label="Add to calendar"><Icon name="plus" size={28} /></button>
    </>
  );
}
