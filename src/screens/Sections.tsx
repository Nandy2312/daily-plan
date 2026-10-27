import { useEffect, useState } from "react";
import { useNav } from "../App";
import { addDays, daysBetween, fmtDay, fmtShort, fmtTime, relDay, todayKey, uid, weekDays } from "../lib/dates";
import { emptyFoodDay, MEAL_SLOTS, Place, Task } from "../lib/model";
import { dancePractices, occurrences, rupees, sessions, streak, sum } from "../lib/plan";
import { useStore } from "../lib/store";
import { Empty, Field, Icon, MoneyInput, Ring, Seg, Sheet, Tick, useToast } from "../ui/kit";
import { OnCalendar } from "./Areas";

/* ================= Food ================= */

export function Food() {
  const { s, update } = useStore();
  const [date, setDate] = useState(todayKey());
  const day = s.food[date] || emptyFoodDay();
  const t = todayKey();
  const setDay = (fn: (f: typeof day) => void) => update((d) => { const f = (d.food[date] = d.food[date] || emptyFoodDay()); fn(f); });
  const mealText = (slot: string) => day.meals.find((m) => m.slot === slot)?.text || "";
  const setMeal = (slot: string, text: string) => setDay((f) => {
    const m = f.meals.find((x) => x.slot === slot);
    if (!text.trim()) f.meals = f.meals.filter((x) => x.slot !== slot);
    else if (m) m.text = text;
    else f.meals.push({ id: uid(), slot, text });
  });
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(t, -6 + i));

  return (
    <>
      <div className="day-switch">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><Icon name="left" /></button>
        <b>{relDay(date)}</b>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><Icon name="right" /></button>
      </div>

      <div className="section-head"><h2>Who's cooking?</h2></div>
      <Seg value={day.cook || ("" as any)} onChange={(v) => setDay((f) => { f.cook = f.cook === v ? "" : v; })}
        options={[{ id: "self", label: "Cooking myself" }, { id: "akka", label: "Cook akka" }]} />

      <div className="section-head"><h2>Meals</h2><small className="muted">keep it simple</small></div>
      <div className="card">
        {MEAL_SLOTS.map((slot) => (
          <label key={slot} className="meal-row">
            <span>{slot}</span>
            <input type="text" value={mealText(slot)} placeholder={slot === "Breakfast" ? "e.g. Oats + fruit" : slot === "Lunch" ? "e.g. Rice, dal, sabzi" : slot === "Snack" ? "e.g. Nuts" : "e.g. Chapati + paneer"}
              onChange={(e) => setMeal(slot, e.target.value)} />
          </label>
        ))}
      </div>

      <div className="section-head"><h2>Energy</h2></div>
      <div className="energy">
        {([["low", "Tired"], ["ok", "Okay"], ["good", "Good"]] as const).map(([id, label]) => (
          <button key={id} className={`energy-btn e-${id}${day.energy === id ? " on" : ""}`} onClick={() => setDay((f) => { f.energy = f.energy === id ? "" : id; })}>
            <span className="face" />{label}
          </button>
        ))}
      </div>
      <textarea className="note-box" rows={2} value={day.note} placeholder="A quick note — what made you tired or gave you energy?" onChange={(e) => setDay((f) => { f.note = e.target.value; })} />

      <div className="section-head"><h2>Last 7 days</h2></div>
      <div className="card week-dots">
        {last7.map((d) => {
          const f = s.food[d];
          return (
            <div key={d} className="wd">
              <small>{fmtDay(d, { weekday: "narrow" })}</small>
              <i className={`cook-${f?.cook || "none"} energy-${f?.energy || "none"}`} title={f?.cook || ""} />
            </div>
          );
        })}
        <p className="tiny muted">Filled = cook akka · ring = cooked myself · colour = energy</p>
      </div>

      <OnCalendar cat="food" />
    </>
  );
}

/* ================= Workout ================= */

const WORKOUT_TYPES = [
  { id: "Strength training", icon: "workout" },
  { id: "Swimming", icon: "workout" },
  { id: "Running", icon: "workout" },
  { id: "Home workout", icon: "home" },
];

export function Workout() {
  const { s, update } = useStore();
  const toast = useToast();
  const [logOpen, setLogOpen] = useState(false);
  const [, tick] = useState(0);
  const t = todayKey();
  const wk = weekDays(t);
  const week = sessions(s, wk[0], wk[6]);
  const recent = sessions(s, addDays(t, -30), t).slice(0, 8);
  const timer = s.timer;

  useEffect(() => {
    if (!timer || timer.pausedAt) return;
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [timer]);

  const elapsed = timer ? ((timer.pausedAt || Date.now()) - timer.startedAt - timer.pausedMs) / 1000 : 0;
  const mmss = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;

  const start = (type: string) => update((d) => { d.timer = { type, startedAt: Date.now(), pausedMs: 0 }; });
  const pause = () => update((d) => {
    if (!d.timer) return;
    if (d.timer.pausedAt) { d.timer.pausedMs += Date.now() - d.timer.pausedAt; delete d.timer.pausedAt; }
    else d.timer.pausedAt = Date.now();
  });
  const finish = () => {
    const mins = Math.max(1, Math.round(elapsed / 60));
    update((d) => { d.workouts.push({ id: uid(), date: t, type: d.timer!.type, mins }); d.timer = null; });
    toast(`${timer!.type} · ${mins} min logged`);
  };

  return (
    <>
      {timer ? (
        <div className="timer card">
          <small className="muted">{timer.type}</small>
          <div className="timer-num">{mmss}</div>
          <div className="row">
            <button className="btn ghost" onClick={pause}><Icon name={timer.pausedAt ? "play" : "pause"} size={20} />{timer.pausedAt ? "Resume" : "Pause"}</button>
            <button className="btn" onClick={finish}><Icon name="check" size={20} />Finish</button>
          </div>
          <button className="link muted" onClick={() => update((d) => { d.timer = null; })}>Cancel without saving</button>
        </div>
      ) : (
        <>
          <div className="section-head"><h2>Quick start</h2><small className="muted">starts a timer</small></div>
          <div className="quick-grid">
            {WORKOUT_TYPES.map((w) => (
              <button key={w.id} className="quick" onClick={() => start(w.id)}>
                <Icon name="play" size={20} /><b>{w.id}</b>
              </button>
            ))}
          </div>
          <button className="link" style={{ marginTop: 10 }} onClick={() => setLogOpen(true)}>Already done? Log it without a timer</button>
        </>
      )}

      <div className="stats card">
        <div><b>{streak(s, "workout")}</b><small>day streak</small></div>
        <div><b>{week.length}</b><small>this week</small></div>
        <div><b>{sum(week, (w) => w.mins)}</b><small>minutes</small></div>
      </div>

      <details className="card soft tip">
        <summary>Can't get to the pool or out for a run?</summary>
        <p>20-minute home circuit, 3 rounds: 12 squats · 8 push-ups · 10 lunges each leg · 30s plank · 20 jumping jacks. Tap <b>Home workout</b> above to time it.</p>
      </details>

      <OnCalendar cat="workout" />

      <div className="section-head"><h2>Recent</h2></div>
      <div className="card">
        {recent.map((w) => (
          <div key={w.id} className="list-row">
            <span className="label"><b>{w.type}</b><small>{relDay(w.date)} · {w.mins} min{w.fromCal ? " · from calendar" : ""}</small></span>
            {!w.fromCal && <button className="x" aria-label="Delete" onClick={() => {
              const backup = s.workouts.find((x) => x.id === w.id)!;
              update((d) => { d.workouts = d.workouts.filter((x) => x.id !== w.id); });
              toast("Deleted", () => update((d) => { d.workouts.push(backup); }));
            }}><Icon name="close" size={16} /></button>}
          </div>
        ))}
        {!recent.length && <Empty>No workouts yet. Tap a quick start above.</Empty>}
      </div>

      <LogWorkout open={logOpen} onClose={() => setLogOpen(false)} />
    </>
  );
}

function LogWorkout({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { update } = useStore();
  const toast = useToast();
  const [type, setType] = useState("Strength training");
  const [mins, setMins] = useState(30);
  const [date, setDate] = useState(todayKey());
  useEffect(() => { if (open) setDate(todayKey()); }, [open]);
  return (
    <Sheet open={open} title="Log a workout" onClose={onClose} saveLabel="Log" onSave={() => {
      update((d) => { d.workouts.push({ id: uid(), date, type, mins }); });
      toast(`${type} logged`);
      onClose();
    }}>
      <div className="field"><span>What</span>
        <div className="chips">{WORKOUT_TYPES.map((w) => <button type="button" key={w.id} className={`chip plain${type === w.id ? " on" : ""}`} onClick={() => setType(w.id)}>{w.id}</button>)}</div>
      </div>
      <div className="field"><span>Minutes</span>
        <div className="chips">{[15, 20, 30, 45, 60, 90].map((m) => <button type="button" key={m} className={`chip plain${mins === m ? " on" : ""}`} onClick={() => setMins(m)}>{m}</button>)}</div>
      </div>
      <Field label="Day"><input type="date" value={date} max={todayKey()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
    </Sheet>
  );
}

/* ================= Work ================= */

const TASK_TYPES: { id: Task["type"]; label: string }[] = [
  { id: "apps", label: "Creating apps" },
  { id: "learning", label: "Learning" },
  { id: "portfolio", label: "Portfolio" },
];

export function Work() {
  const { s, update } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | Task["type"]>("all");
  const [text, setText] = useState("");
  const [learn, setLearn] = useState("");
  const tasks = s.tasks.filter((x) => filter === "all" || x.type === filter).sort((a, b) => Number(a.done) - Number(b.done));
  const addType = filter === "all" ? "apps" : filter;

  const add = () => {
    if (!text.trim()) return;
    update((d) => { d.tasks.unshift({ id: uid(), type: addType, title: text.trim(), done: false }); });
    setText("");
  };

  return (
    <>
      <Seg value={filter} onChange={setFilter} options={[{ id: "all", label: "All" }, ...TASK_TYPES.map((x) => ({ id: x.id, label: x.label.split(" ")[0] === "Creating" ? "Apps" : x.label }))]} />
      <form className="add-inline" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={`New ${TASK_TYPES.find((x) => x.id === addType)!.label.toLowerCase()} task`} enterKeyHint="done" />
        <button className="btn small" type="submit" disabled={!text.trim()}>Add</button>
      </form>
      <div className="card">
        {tasks.map((x) => (
          <div key={x.id} className={`list-row task${x.done ? " done" : ""}`}>
            <Tick on={x.done} cat="work" label="Done" onClick={() => update((d) => { const k = d.tasks.find((y) => y.id === x.id)!; k.done = !k.done; k.doneAt = k.done ? todayKey() : undefined; })} />
            <span className="label"><b>{x.title}</b><small>{TASK_TYPES.find((y) => y.id === x.type)!.label}{x.doneAt ? ` · done ${relDay(x.doneAt).toLowerCase()}` : ""}</small></span>
            <button className="x" aria-label="Delete" onClick={() => {
              update((d) => { d.tasks = d.tasks.filter((y) => y.id !== x.id); });
              toast("Task deleted", () => update((d) => { d.tasks.push(x); }));
            }}><Icon name="close" size={16} /></button>
          </div>
        ))}
        {!tasks.length && <Empty>No tasks here yet.</Empty>}
      </div>

      <div className="section-head"><h2>Learning log</h2><small className="muted">one line a day is enough</small></div>
      <form className="add-inline" onSubmit={(e) => {
        e.preventDefault();
        if (!learn.trim()) return;
        update((d) => { d.learnLog.unshift({ id: uid(), date: todayKey(), text: learn.trim() }); });
        setLearn("");
        toast("Saved to your learning log");
      }}>
        <input type="text" value={learn} onChange={(e) => setLearn(e.target.value)} placeholder="What did you learn today?" />
        <button className="btn small" type="submit" disabled={!learn.trim()}>Save</button>
      </form>
      <div className="card">
        {s.learnLog.slice(0, 10).map((l) => (
          <div key={l.id} className="log-row"><small>{relDay(l.date)}</small><p>{l.text}</p></div>
        ))}
        {!s.learnLog.length && <Empty>Your notes will build up here.</Empty>}
      </div>

      <OnCalendar cat="work" />
    </>
  );
}

/* ================= Dance ================= */

const STATUS = ["idea", "filmed", "posted"] as const;

export function Dance() {
  const { s, update } = useStore();
  const toast = useToast();
  const [idea, setIdea] = useState("");
  const t = todayKey();
  const wk = weekDays(t);
  const n = dancePractices(s, wk[0], wk[6]);
  const target = s.dance.weeklyTarget;

  return (
    <>
      <div className="card hero-row">
        <Ring value={target ? n / target : 0} label={`${n}/${target}`} size={72} />
        <div>
          <strong>{n >= target ? "Practice goal met this week" : `${target - n} more practice${target - n > 1 ? "s" : ""} this week`}</strong>
          <div className="step">
            <span className="muted">Goal per week</span>
            <button onClick={() => update((d) => { d.dance.weeklyTarget = Math.max(1, d.dance.weeklyTarget - 1); })} aria-label="Lower">−</button>
            <b>{target}</b>
            <button onClick={() => update((d) => { d.dance.weeklyTarget = Math.min(7, d.dance.weeklyTarget + 1); })} aria-label="Raise">+</button>
          </div>
        </div>
      </div>
      <button className="btn wide" onClick={() => { update((d) => { d.dance.practices.push({ id: uid(), date: t, mins: 60 }); }); toast("Practice logged for today"); }}>
        <Icon name="check" size={20} />I practised today
      </button>

      <OnCalendar cat="dance" title="Practice schedule" />

      <div className="section-head"><h2>Content ideas</h2><small className="muted">tap the label to move it along</small></div>
      <form className="add-inline" onSubmit={(e) => {
        e.preventDefault();
        if (!idea.trim()) return;
        update((d) => { d.dance.ideas.unshift({ id: uid(), text: idea.trim(), status: "idea" }); });
        setIdea("");
      }}>
        <input type="text" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="A reel, a tutorial, a routine…" />
        <button className="btn small" type="submit" disabled={!idea.trim()}>Add</button>
      </form>
      <div className="card">
        {s.dance.ideas.map((x) => (
          <div key={x.id} className="list-row">
            <span className="label"><b>{x.text}</b></span>
            <button className={`status s-${x.status}`} onClick={() => update((d) => {
              const i = d.dance.ideas.find((y) => y.id === x.id)!;
              i.status = STATUS[(STATUS.indexOf(i.status) + 1) % STATUS.length];
            })}>{x.status === "idea" ? "Idea" : x.status === "filmed" ? "Filmed" : "Posted"}</button>
            <button className="x" aria-label="Delete" onClick={() => {
              update((d) => { d.dance.ideas = d.dance.ideas.filter((y) => y.id !== x.id); });
              toast("Idea deleted", () => update((d) => { d.dance.ideas.push(x); }));
            }}><Icon name="close" size={16} /></button>
          </div>
        ))}
        {!s.dance.ideas.length && <Empty>Write ideas down the moment they come.</Empty>}
      </div>
    </>
  );
}

/* ================= Outings ================= */

export function Outings() {
  const { s } = useStore();
  const nav = useNav();
  const t = todayKey();
  const wk = weekDays(t);
  const thisWeek = wk.flatMap((d) => occurrences(s, d)).filter((o) => o.ev.cat === "outings");
  const past = Array.from({ length: 60 }, (_, i) => addDays(t, -i - 1)).flatMap((d) => occurrences(s, d)).filter((o) => o.ev.cat === "outings" && o.done);
  const plan = (d: string) => nav.addEvent({ date: d, start: "17:00", cat: "outings", kind: "outing", title: "Weekly outing", mins: 180 });
  const sat = wk[5], sun = wk[6];

  return (
    <>
      {thisWeek.length ? (
        <div className="card outing-hero">
          <small className="muted">This week</small>
          {thisWeek.map((o) => (
            <button key={o.key} className="outing-line" onClick={() => nav.editEvent(o)}>
              <b>{o.ev.title}</b><span>{fmtDay(o.date, { weekday: "long" })} · {fmtTime(o.start)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="card outing-hero empty-hero">
          <b>No outing planned this week</b>
          <p className="muted">Pick a day — it goes on your calendar.</p>
          <div className="row">
            {sat >= t && <button className="btn" onClick={() => plan(sat)}>Saturday</button>}
            {sun >= t && <button className="btn ghost" onClick={() => plan(sun)}>Sunday</button>}
            {sun < t && <button className="btn" onClick={() => plan(addDays(t, 1))}>Tomorrow</button>}
          </div>
        </div>
      )}
      <p className="tiny muted" style={{ textAlign: "center" }}>Want a reminder on your phone? Me → Add reminders to iPhone Calendar.</p>

      <OnCalendar cat="outings" />

      <div className="section-head"><h2>Recent outings</h2></div>
      <div className="card">
        {past.map((o) => <div key={o.key} className="list-row"><span className="label"><b>{o.ev.title}</b><small>{fmtShort(o.date)}</small></span></div>)}
        {!past.length && <Empty>Tick an outing on the calendar and it shows up here.</Empty>}
      </div>
    </>
  );
}

/* ================= Home ================= */

export function Home() {
  const { s, update } = useStore();
  const toast = useToast();
  const [task, setTask] = useState("");
  const [place, setPlace] = useState<Place | null | "new">(null);
  const t = todayKey();
  const left = s.home.moveBy ? daysBetween(t, s.home.moveBy) : null;
  const doneN = s.home.tasks.filter((x) => x.done).length;

  return (
    <>
      <div className="card countdown">
        <div>
          <div className="count-num">{left === null ? "—" : Math.abs(left)}</div>
          <small className="muted">{left === null ? "set a date" : left >= 0 ? "days until you move" : "days past the move date"}</small>
        </div>
        <label className="field" style={{ marginTop: 0 }}><span>Move by</span>
          <input type="date" value={s.home.moveBy} onChange={(e) => update((d) => { d.home.moveBy = e.target.value; })} />
        </label>
      </div>

      <div className="section-head"><h2>Checklist</h2><small className="muted">{doneN} of {s.home.tasks.length} done</small></div>
      <div className="card">
        {s.home.tasks.map((x) => (
          <div key={x.id} className={`list-row task${x.done ? " done" : ""}`}>
            <Tick on={x.done} cat="home" label="Done" onClick={() => update((d) => { const k = d.home.tasks.find((y) => y.id === x.id)!; k.done = !k.done; })} />
            <span className="label"><b>{x.title}</b></span>
            <button className="x" aria-label="Delete" onClick={() => {
              update((d) => { d.home.tasks = d.home.tasks.filter((y) => y.id !== x.id); });
              toast("Removed", () => update((d) => { d.home.tasks.push(x); }));
            }}><Icon name="close" size={16} /></button>
          </div>
        ))}
        <form className="add-inline in-card" onSubmit={(e) => {
          e.preventDefault();
          if (!task.trim()) return;
          update((d) => { d.home.tasks.push({ id: uid(), title: task.trim(), done: false }); });
          setTask("");
        }}>
          <input type="text" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a step" />
          <button className="btn small" type="submit" disabled={!task.trim()}>Add</button>
        </form>
      </div>

      <OnCalendar cat="home" />

      <div className="section-head"><h2>Places seen</h2>{s.home.budget ? <small className="muted">budget {rupees(s.home.budget)}</small> : null}</div>
      <div className="card">
        {[...s.home.places].sort((a, b) => (b.rating || 0) - (a.rating || 0)).map((p) => (
          <div key={p.id} className="place">
            <button className="place-head" onClick={() => setPlace(p)}>
              <b>{p.name}</b><span className={s.home.budget && p.rent > s.home.budget ? "bad" : ""}>{p.rent ? rupees(p.rent) : ""}</span>
            </button>
            {p.notes && <p>{p.notes}</p>}
            <div className="stars">{[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={n <= (p.rating || 0) ? "on" : ""} aria-label={`${n} stars`}
                onClick={() => update((d) => { const x = d.home.places.find((y) => y.id === p.id)!; x.rating = x.rating === n ? 0 : n; })}>★</button>
            ))}</div>
          </div>
        ))}
        {!s.home.places.length && <Empty>Add each place you visit and give it stars.</Empty>}
        <button className="add-row" onClick={() => setPlace("new")}><Icon name="plus" size={18} /> Add a place</button>
      </div>
      <Field label="Rent budget a month">
        <MoneyInput value={s.home.budget || ""} onChange={(v) => update((d) => { d.home.budget = Math.max(0, Number(v) || 0); })} />
      </Field>

      <PlaceSheet place={place} onClose={() => setPlace(null)} />
    </>
  );
}

function PlaceSheet({ place, onClose }: { place: Place | null | "new"; onClose: () => void }) {
  const { update } = useStore();
  const toast = useToast();
  const isNew = place === "new";
  const [f, setF] = useState({ name: "", rent: "", notes: "" });
  useEffect(() => {
    if (place && place !== "new") setF({ name: place.name, rent: String(place.rent || ""), notes: place.notes });
    else setF({ name: "", rent: "", notes: "" });
  }, [place]);
  return (
    <Sheet open={!!place} title={isNew ? "Add a place" : "Edit place"} saveLabel={isNew ? "Add" : "Save"} onClose={onClose} onSave={() => {
      if (!f.name.trim()) { toast("Add a name for the place"); return; }
      const data = { name: f.name.trim(), rent: Number(f.rent) || 0, notes: f.notes.trim() };
      update((d) => {
        if (isNew) d.home.places.push({ id: uid(), rating: 0, ...data });
        else Object.assign(d.home.places.find((x) => x.id === (place as Place).id)!, data);
      });
      onClose();
    }}>
      <Field label="Area or building"><input type="text" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. 2BHK near the dance studio" /></Field>
      <div className="field"><span>Rent a month</span><MoneyInput value={f.rent} onChange={(v) => setF({ ...f, rent: v })} /></div>
      <Field label="Notes"><textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Commute, kitchen, light, owner…" /></Field>
      {!isNew && <button type="button" className="btn danger wide" onClick={() => {
        const p = place as Place;
        update((d) => { d.home.places = d.home.places.filter((x) => x.id !== p.id); });
        toast("Place deleted", () => update((d) => { d.home.places.push(p); }));
        onClose();
      }}>Delete</button>}
    </Sheet>
  );
}
