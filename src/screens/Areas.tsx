import { useNav } from "../App";
import { addDays, fmtTime, relDay, todayKey } from "../lib/dates";
import { CAT_LIST, CATS, Cat } from "../lib/model";
import { areaDone, occurrences, streak, TEMPLATES } from "../lib/plan";
import { useStore } from "../lib/store";
import { catStyle, Icon, Tick } from "../ui/kit";
import { areaLine } from "./Today";
import { Dance, Food, Home, Outings, Work, Workout } from "./Sections";
import { Money } from "./Money";

export function Areas() {
  const { s } = useStore();
  const nav = useNav();
  const t = todayKey();
  return (
    <>
      <header className="page-head"><div><p className="eyebrow">Your life, in seven parts</p><h1>Areas</h1></div></header>
      <div className="area-list">
        {CAT_LIST.map((c) => {
          const st = streak(s, c);
          return (
            <button key={c} className={`area-card${areaDone(s, t, c) ? " on" : ""}`} style={catStyle(c)} onClick={() => nav.openArea(c)}>
              <span className="area-icon big"><Icon name={c} size={26} /></span>
              <span className="area-card-text"><b>{CATS[c].label}</b><small>{areaLine(s, c)}</small></span>
              {st > 1 && <span className="streak-pill">{st} days</span>}
              <Icon name="right" size={18} className="muted" />
            </button>
          );
        })}
      </div>
    </>
  );
}

export function AreaScreen({ cat }: { cat: Cat }) {
  const { s, update } = useStore();
  const nav = useNav();
  const t = todayKey();
  const on = areaDone(s, t, cat);
  const st = streak(s, cat);
  return (
    <div style={catStyle(cat)}>
      <header className="area-head">
        <button className="back" onClick={() => nav.openArea(null)}><Icon name="left" size={20} /> Areas</button>
        <div className="area-title">
          <span className="area-icon big"><Icon name={cat} size={28} /></span>
          <div><h1>{CATS[cat].label}</h1><small className="muted">{st > 1 ? `${st}-day streak` : areaLine(s, cat)}</small></div>
          <Tick big on={on} cat={cat} label={`${CATS[cat].label} done today`} onClick={() => update((d) => {
            const day = (d.checks[t] = d.checks[t] || {});
            if (day[cat]) delete day[cat]; else day[cat] = true;
          })} />
        </div>
      </header>
      {cat === "food" && <Food />}
      {cat === "workout" && <Workout />}
      {cat === "work" && <Work />}
      {cat === "dance" && <Dance />}
      {cat === "money" && <Money />}
      {cat === "outings" && <Outings />}
      {cat === "home" && <Home />}
    </div>
  );
}

// "On your calendar" block shown in every area: the next 7 days of this area's items
export function OnCalendar({ cat, title = "On your calendar", kinds }: { cat: Cat; title?: string; kinds?: string[] }) {
  const { s, update } = useStore();
  const nav = useNav();
  const t = todayKey();
  const items = Array.from({ length: 7 }, (_, i) => addDays(t, i)).flatMap((d) => occurrences(s, d)).filter((o) => o.ev.cat === cat);
  const tpls = TEMPLATES.filter((x) => x.cat === cat && (!kinds || kinds.includes(x.kind)));
  return (
    <>
      <div className="section-head"><h2>{title}</h2><small className="muted">next 7 days</small></div>
      <div className="card">
        {items.slice(0, 8).map((o) => (
          <div key={o.key} className={`agenda${o.done ? " done" : ""}`} style={catStyle(o.ev.cat)} onClick={() => nav.editEvent(o)}>
            <span className="agenda-time">{relDay(o.date)}<small>{fmtTime(o.start)}</small></span>
            <span className="agenda-bar" />
            <span className="agenda-text"><b>{o.ev.title}</b>{o.ev.repeat !== "none" && <small><Icon name="repeat" size={12} /> repeats</small>}</span>
            {o.date <= t && <Tick on={o.done} cat={o.ev.cat} label="Done" onClick={() => update((d) => { if (d.done[o.key]) delete d.done[o.key]; else d.done[o.key] = true; })} />}
          </div>
        ))}
        {!items.length && <div className="empty">Nothing planned for {CATS[cat].label.toLowerCase()} this week.</div>}
        <div className="tpl-row in-card">
          {tpls.map((x) => (
            <button key={x.kind} className="tpl" style={catStyle(x.cat)}
              onClick={() => nav.addEvent({ date: addDays(t, 1), start: x.cat === "workout" ? "07:00" : "18:00", cat: x.cat, kind: x.kind, title: x.title, mins: x.mins })}>
              <Icon name="plus" size={16} />{x.title}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
