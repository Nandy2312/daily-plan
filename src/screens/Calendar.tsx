import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNav } from "../App";
import { addDays, addMonths, DAY_SHORT, fmtDay, fmtMonth, fmtShort, fmtTime, fromMin, monthKey, nowMin, parse, todayKey, toMin, uid, weekDays, weekStart } from "../lib/dates";
import { CATS, Ev } from "../lib/model";
import { layout, Occ, occurrences, suggestions } from "../lib/plan";
import { useStore } from "../lib/store";
import { catStyle, Icon, Seg, useToast } from "../ui/kit";

type View = "day" | "week" | "month";
const FIRST_HOUR = 5;
const LAST_HOUR = 24;

export function Calendar() {
  const { s, update } = useStore();
  const nav = useNav();
  const toast = useToast();
  const [view, setView] = useState<View>(() => (localStorage.getItem("dailyplan.calview") as View) || "day");
  const date = nav.calDate;
  const t = todayKey();
  const sugg = suggestions(s)[0];

  useEffect(() => { try { localStorage.setItem("dailyplan.calview", view); } catch (e) { /* ignore */ } }, [view]);

  const step = (n: number) => {
    if (view === "day") nav.setCalDate(addDays(date, n));
    else if (view === "week") nav.setCalDate(addDays(date, 7 * n));
    else nav.setCalDate(addMonths(monthKey(date), n) + "-01");
  };

  const title = view === "day" ? fmtDay(date)
    : view === "week" ? `${fmtShort(weekStart(date))} – ${fmtShort(addDays(weekStart(date), 6))}`
    : fmtMonth(monthKey(date));
  const isCurrent = view === "day" ? date === t : view === "week" ? weekStart(date) === weekStart(t) : monthKey(date) === monthKey(t);

  // drag a calendar item to a new day/time. A repeating item moves for this day only.
  const move = (o: Occ, newDate: string, newStart: string) => {
    const len = toMin(o.end) - toMin(o.start);
    const newEnd = fromMin(Math.min(toMin(newStart) + len, 24 * 60 - 1));
    const before = { events: structuredClone(s.events), done: { ...s.done } };
    update((d) => {
      const ev = d.events.find((e) => e.id === o.ev.id);
      if (!ev) return;
      if (ev.repeat === "none") {
        if (d.done[o.key]) { delete d.done[o.key]; d.done[`${ev.id}@${newDate}`] = true; }
        Object.assign(ev, { date: newDate, start: newStart, end: newEnd });
      } else {
        ev.skip = [...(ev.skip || []), o.date];
        const copy: Ev = { ...ev, id: uid(), date: newDate, start: newStart, end: newEnd, repeat: "none", skip: undefined };
        d.events.push(copy);
        if (d.done[o.key]) d.done[`${copy.id}@${newDate}`] = true;
      }
    });
    toast(`Moved to ${fmtDay(newDate, { weekday: "short" })} ${fmtTime(newStart)}${o.ev.repeat !== "none" ? " (this day only)" : ""}`,
      () => update((d) => { d.events = before.events; d.done = before.done; }));
  };

  return (
    <>
      <header className="cal-head">
        <div className="cal-title">
          <h1>{title}</h1>
          {!isCurrent && <button className="link" onClick={() => nav.setCalDate(t)}>Today</button>}
        </div>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous"><Icon name="left" /></button>
          <button className="icon-btn" onClick={() => step(1)} aria-label="Next"><Icon name="right" /></button>
        </div>
      </header>
      <Seg value={view} onChange={setView} options={[{ id: "day", label: "Day" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }]} />

      {sugg && view !== "month" && (
        <button className="suggest-strip" onClick={() => nav.addEvent({ date: sugg.date, start: sugg.start, cat: sugg.tpl.cat, kind: sugg.tpl.kind, title: sugg.tpl.title, mins: sugg.tpl.mins })}>
          <Icon name="spark" size={18} /><span>{sugg.text}</span><b>Plan</b>
        </button>
      )}

      {view === "day" && (
        <>
          <WeekStrip date={date} onPick={nav.setCalDate} />
          <TimeGrid dates={[date]} hourH={64} onMove={move} onSwipe={(n) => nav.setCalDate(addDays(date, n))} />
        </>
      )}
      {view === "week" && <TimeGrid dates={weekDays(date)} hourH={52} onMove={move} onSwipe={(n) => nav.setCalDate(addDays(date, 7 * n))}
        onDayTap={(d) => { nav.setCalDate(d); setView("day"); }} />}
      {view === "month" && <Month date={date} onPick={(d) => { nav.setCalDate(d); setView("day"); }} />}

      <p className="hint-line">Tap an empty time to add · hold and drag to move{view !== "month" ? " · swipe to change " + view : ""}</p>
      <button className="fab" onClick={() => nav.addEvent({ date, start: date === t ? fromMin(Math.ceil((nowMin() + 1) / 30) * 30) : "09:00" })} aria-label="Add to calendar">
        <Icon name="plus" size={28} />
      </button>
    </>
  );
}

function WeekStrip({ date, onPick }: { date: string; onPick: (d: string) => void }) {
  const { s } = useStore();
  const t = todayKey();
  return (
    <div className="week-strip">
      {weekDays(date).map((d) => {
        const cats = [...new Set(occurrences(s, d).map((o) => o.ev.cat))].slice(0, 4);
        return (
          <button key={d} className={`ws-day${d === date ? " sel" : ""}${d === t ? " today" : ""}`} onClick={() => onPick(d)}>
            <small>{DAY_SHORT[parse(d).getDay()]}</small>
            <b>{parse(d).getDate()}</b>
            <span className="dots">{cats.map((c) => <i key={c} style={catStyle(c)} />)}</span>
          </button>
        );
      })}
    </div>
  );
}

function TimeGrid({ dates, hourH, onMove, onSwipe, onDayTap }: {
  dates: string[]; hourH: number; onMove: (o: Occ, d: string, start: string) => void; onSwipe: (n: number) => void; onDayTap?: (d: string) => void;
}) {
  const { s } = useStore();
  const nav = useNav();
  const t = todayKey();
  const cols = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ key: string; dMin: number; dDay: number } | null>(null);
  const dragRef = useRef<any>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const minToY = (m: number) => ((m - FIRST_HOUR * 60) / 60) * hourH;
  const height = (LAST_HOUR - FIRST_HOUR) * hourH;
  const multi = dates.length > 1;

  // start the view around now (or 7am)
  useLayoutEffect(() => {
    const el = cols.current;
    if (!el) return;
    const m = dates.includes(t) ? nowMin() - 60 : 7 * 60;
    const y = el.getBoundingClientRect().top + window.scrollY + minToY(Math.max(FIRST_HOUR * 60, m)) - 120;
    window.scrollTo({ top: Math.max(0, y) });
  }, [dates[0], dates.length]);

  // stop the page scrolling while an item is being dragged (iOS needs a non-passive listener)
  useEffect(() => {
    const block = (e: TouchEvent) => { if (dragRef.current?.active) e.preventDefault(); };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);

  const colWidth = () => (cols.current ? cols.current.getBoundingClientRect().width / dates.length : 1);

  const onDown = (e: React.PointerEvent, o: Occ) => {
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const st = { o, x: e.clientX, y: e.clientY, active: false, moved: false, pointerId: e.pointerId, el, timer: 0 as any };
    dragRef.current = st;
    const begin = () => {
      st.active = true;
      try { el.setPointerCapture(st.pointerId); } catch (err) { /* ignore */ }
      setDrag({ key: o.key, dMin: 0, dDay: 0 });
      if (navigator.vibrate) navigator.vibrate(10);
    };
    if (e.pointerType === "mouse") st.timer = 0;
    else st.timer = setTimeout(begin, 280);
    (st as any).begin = begin;
  };

  const onMoveP = (e: React.PointerEvent) => {
    const st = dragRef.current;
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.active) {
      if (Math.hypot(dx, dy) > 8) {
        if (e.pointerType === "mouse") st.begin();
        else { clearTimeout(st.timer); dragRef.current = null; return; } // it's a scroll
      } else return;
    }
    st.moved = true;
    const dMin = Math.round((dy / hourH) * 60 / 15) * 15;
    const dDay = multi ? Math.round(dx / colWidth()) : 0;
    setDrag({ key: st.o.key, dMin, dDay });
  };

  const onUp = () => {
    const st = dragRef.current;
    dragRef.current = null;
    if (!st) return;
    clearTimeout(st.timer);
    if (st.active && drag && (drag.dMin || drag.dDay)) {
      const o: Occ = st.o;
      const idx = Math.max(0, Math.min(dates.length - 1, dates.indexOf(o.date) + drag.dDay));
      const start = fromMin(Math.max(FIRST_HOUR * 60, Math.min(23 * 60 + 45, toMin(o.start) + drag.dMin)));
      onMove(o, dates[idx], start);
    } else if (!st.moved) {
      nav.editEvent(st.o);
    }
    setDrag(null);
  };

  const slotTap = (e: React.MouseEvent, d: string) => {
    if (dragRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const m = FIRST_HOUR * 60 + Math.floor(((e.clientY - rect.top) / hourH) * 2) * 30;
    nav.addEvent({ date: d, start: fromMin(Math.min(m, 23 * 60)), fixedTime: true });
  };

  const touchStart = (e: React.TouchEvent) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const touchEnd = (e: React.TouchEvent) => {
    const st = swipe.current;
    swipe.current = null;
    if (!st || drag || dragRef.current?.active) return;
    const dx = e.changedTouches[0].clientX - st.x, dy = e.changedTouches[0].clientY - st.y;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 45) onSwipe(dx < 0 ? 1 : -1);
  };

  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);

  return (
    <div className={`tg${multi ? " week" : ""}`} onTouchStart={touchStart} onTouchEnd={touchEnd}>
      {multi && (
        <div className="tg-days">
          <span className="tg-gutter" />
          {dates.map((d) => (
            <button key={d} className={`tg-dayname${d === t ? " today" : ""}`} onClick={() => onDayTap?.(d)}>
              <small>{DAY_SHORT[parse(d).getDay()][0]}</small><b>{parse(d).getDate()}</b>
            </button>
          ))}
        </div>
      )}
      <div className="tg-body" style={{ height }}>
        <div className="tg-gutter">
          {hours.map((h) => <span key={h} style={{ top: (h - FIRST_HOUR) * hourH }}>{h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}</span>)}
        </div>
        <div className="tg-cols" ref={cols}>
          {hours.map((h) => <div key={h} className="tg-line" style={{ top: (h - FIRST_HOUR) * hourH }} />)}
          {dates.map((d, ci) => {
            const items = layout(occurrences(s, d));
            return (
              <div key={d} className={`tg-col${d === t ? " today" : ""}`} onClick={(e) => slotTap(e, d)}>
                {d === t && nowMin() >= FIRST_HOUR * 60 && <div className="now-line" style={{ top: minToY(nowMin()) }} />}
                {items.map(({ o, s: sm, e: em, col, cols: n }) => {
                  const dragging = drag?.key === o.key;
                  const top = minToY(sm) + (dragging ? (drag!.dMin / 60) * hourH : 0);
                  const shiftX = dragging ? drag!.dDay * 100 : 0;
                  return (
                    <div key={o.key}
                      className={`tg-ev${o.done ? " done" : ""}${dragging ? " dragging" : ""}`}
                      style={{ ...catStyle(o.ev.cat), top, height: Math.max(22, ((em - sm) / 60) * hourH - 2),
                        left: `calc(${(col / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)`,
                        transform: shiftX ? `translateX(${shiftX * n}%)` : undefined, zIndex: dragging ? 5 : 1 }}
                      onPointerDown={(e) => onDown(e, o)} onPointerMove={onMoveP} onPointerUp={onUp} onPointerCancel={() => { dragRef.current = null; setDrag(null); }}
                      onClick={(e) => e.stopPropagation()}
                      onContextMenu={(e) => e.preventDefault()}>
                      <b>{o.ev.title}</b>
                      {!multi && <small>{fmtTime(dragging ? fromMin(toMin(o.start) + drag!.dMin) : o.start)} – {fmtTime(dragging ? fromMin(toMin(o.end) + drag!.dMin) : o.end)}{o.ev.repeat !== "none" ? " · repeats" : ""}</small>}
                      {o.done && <span className="ev-check"><Icon name="check" size={14} /></span>}
                      {dragging && multi && <span className="drag-label">{DAY_SHORT[parse(dates[Math.max(0, Math.min(6, ci + drag!.dDay))]).getDay()]} {fmtTime(fromMin(toMin(o.start) + drag!.dMin))}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Month({ date, onPick }: { date: string; onPick: (d: string) => void }) {
  const { s } = useStore();
  const t = todayKey();
  const mk = monthKey(date);
  const first = weekStart(`${mk}-01`);
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const rows = days[35].startsWith(mk) ? 6 : 5;
  return (
    <div className="month">
      <div className="month-head">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="month-grid">
        {days.slice(0, rows * 7).map((d) => {
          const occs = occurrences(s, d);
          const inMonth = d.startsWith(mk);
          return (
            <button key={d} className={`m-day${inMonth ? "" : " out"}${d === t ? " today" : ""}`} onClick={() => onPick(d)}>
              <b>{parse(d).getDate()}</b>
              <span className="m-evs">
                {occs.slice(0, 3).map((o) => <i key={o.key} className={o.done ? "done" : ""} style={catStyle(o.ev.cat)} title={o.ev.title} />)}
                {occs.length > 3 && <small>+{occs.length - 3}</small>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="legend">
        {(Object.keys(CATS) as (keyof typeof CATS)[]).map((c) => <span key={c} style={catStyle(c)}><i />{CATS[c].label}</span>)}
      </div>
    </div>
  );
}
