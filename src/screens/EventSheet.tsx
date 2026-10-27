import { useEffect, useState } from "react";
import { fmtDay, toMin, todayKey, uid } from "../lib/dates";
import { Cat, Ev, Repeat } from "../lib/model";
import { endFrom, Occ, REPEATS, TEMPLATES } from "../lib/plan";
import { useStore } from "../lib/store";
import { CatChips, catStyle, Field, Icon, Seg, Sheet, useToast } from "../ui/kit";

export interface EventDefaults { date?: string; start?: string; fixedTime?: boolean; cat?: Cat; kind?: string; title?: string; mins?: number; repeat?: Repeat }

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];
const durLabel = (m: number) => (m < 60 ? `${m}m` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);

export function EventSheet({ open, occ, defaults, onClose }: { open: boolean; occ?: Occ | null; defaults?: EventDefaults; onClose: () => void }) {
  const { update } = useStore();
  const toast = useToast();
  const editing = !!occ;
  const [f, setF] = useState(() => blank());
  const [scope, setScope] = useState<"one" | "all">("all");
  const [confirmDel, setConfirmDel] = useState(false);

  function blank() {
    return { title: "", cat: "workout" as Cat, kind: "", date: todayKey(), start: "07:00", mins: 30, repeat: "none" as Repeat, note: "" };
  }

  useEffect(() => {
    if (!open) return;
    setConfirmDel(false);
    if (occ) {
      const e = occ.ev;
      setF({ title: e.title, cat: e.cat, kind: e.kind || "", date: occ.date, start: e.start, mins: Math.max(5, toMin(e.end) - toMin(e.start)), repeat: "none", note: e.note || "" });
      setScope(e.repeat === "none" ? "all" : "one");
    } else {
      const b = blank();
      setF({ ...b, ...defaults, title: defaults?.title ?? "", kind: defaults?.kind ?? "", mins: defaults?.mins ?? b.mins, repeat: defaults?.repeat ?? "none" });
      setScope("all");
    }
  }, [open]);

  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const recurring = editing && occ!.ev.repeat !== "none";

  const save = () => {
    const title = f.title.trim();
    if (!title) { toast("Give it a name, or tap a template"); return; }
    const fields = { title, cat: f.cat, kind: f.kind || undefined, start: f.start, end: endFrom(f.start, f.mins), note: f.note.trim() || undefined };
    update((d) => {
      if (!editing) {
        d.events.push({ id: uid(), date: f.date, repeat: f.repeat, ...fields });
        return;
      }
      const ev = d.events.find((e) => e.id === occ!.ev.id);
      if (!ev) return;
      if (recurring && scope === "one") {
        ev.skip = [...(ev.skip || []), occ!.date];
        const id = uid();
        d.events.push({ id, date: f.date, repeat: "none", ...fields });
        if (d.done[occ!.key]) d.done[`${id}@${f.date}`] = true;
      } else {
        // moving the whole series keeps its pattern; the series starts from the new date
        Object.assign(ev, fields, { repeat: f.repeat, date: recurring && f.date === occ!.date ? ev.date : f.date });
      }
    });
    toast(editing ? "Saved" : `Added for ${fmtDay(f.date, { weekday: "short", day: "numeric", month: "short" })}`);
    onClose();
  };

  const remove = (which: "one" | "all") => {
    let backup: Ev | undefined;
    update((d) => {
      const i = d.events.findIndex((e) => e.id === occ!.ev.id);
      if (i < 0) return;
      backup = structuredClone(d.events[i]);
      if (which === "one" && d.events[i].repeat !== "none") d.events[i].skip = [...(d.events[i].skip || []), occ!.date];
      else d.events.splice(i, 1);
    });
    toast(which === "one" && recurring ? "Removed from this day" : "Deleted", () =>
      update((d) => {
        const i = d.events.findIndex((e) => e.id === backup!.id);
        if (i >= 0) d.events[i] = backup!; else d.events.push(backup!);
      }));
    onClose();
  };

  const toggleDone = () => {
    update((d) => { if (d.done[occ!.key]) delete d.done[occ!.key]; else d.done[occ!.key] = true; });
    toast(occ!.done ? "Marked not done" : "Done — nice work");
    onClose();
  };

  return (
    <Sheet open={open} title={editing ? "Edit" : "Add to calendar"} onClose={onClose} onSave={save} saveLabel={editing ? "Save" : "Add"} tall>
      {!editing && (
        <div className="field">
          <span>Quick pick</span>
          <div className="tpl-row">
            {TEMPLATES.map((t) => (
              <button type="button" key={t.kind} className={`tpl${f.kind === t.kind ? " on" : ""}`} style={catStyle(t.cat)}
                onClick={() => set({ title: t.title, cat: t.cat, kind: t.kind, mins: t.mins, ...(defaults?.fixedTime ? {} : { start: t.at }) })}>
                <Icon name={t.cat} size={18} />{t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <button type="button" className={`btn wide ${occ!.done ? "ghost" : ""}`} style={{ ...catStyle(f.cat), marginTop: 14 }} onClick={toggleDone}>
          <Icon name="check" size={20} /> {occ!.done ? "Done · tap to undo" : "Mark as done"}
        </button>
      )}

      <Field label="What">
        <input type="text" value={f.title} onChange={(e) => set({ title: e.target.value, kind: "" })} placeholder="e.g. Yoga at home" />
      </Field>
      <div className="field"><span>Area</span><CatChips value={f.cat} onChange={(cat) => set({ cat })} /></div>
      <div className="row">
        <Field label="Day"><input type="date" value={f.date} onChange={(e) => e.target.value && set({ date: e.target.value })} /></Field>
        <Field label="Starts"><input type="time" value={f.start} step={300} onChange={(e) => e.target.value && set({ start: e.target.value })} /></Field>
      </div>
      <div className="field">
        <span>How long</span>
        <div className="chips">
          {DURATIONS.map((m) => (
            <button type="button" key={m} className={`chip plain${f.mins === m ? " on" : ""}`} onClick={() => set({ mins: m })}>{durLabel(m)}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Repeat</span>
        <div className="chips">
          {REPEATS.map((r) => (
            <button type="button" key={r.id} className={`chip plain${f.repeat === r.id ? " on" : ""}`} onClick={() => set({ repeat: r.id })}
              disabled={recurring && scope === "one" && r.id !== "none"}>
              {r.label(f.date)}
            </button>
          ))}
        </div>
      </div>
      {recurring && (
        <div className="field">
          <span>This repeats. Change…</span>
          <Seg value={scope} onChange={(v) => { setScope(v); if (v === "one") set({ repeat: "none" }); else set({ repeat: occ!.ev.repeat }); }}
            options={[{ id: "one", label: "Only this day" }, { id: "all", label: "Every time" }]} />
        </div>
      )}
      <Field label="Note (optional)">
        <input type="text" value={f.note} onChange={(e) => set({ note: e.target.value })} placeholder="Anything to remember" />
      </Field>

      {editing && !confirmDel && <button type="button" className="btn danger wide" onClick={() => (recurring ? setConfirmDel(true) : remove("all"))}>Delete</button>}
      {editing && confirmDel && (
        <div className="row" style={{ marginTop: 22 }}>
          <button type="button" className="btn danger" onClick={() => remove("one")}>Only this day</button>
          <button type="button" className="btn danger" onClick={() => remove("all")}>Every time</button>
        </div>
      )}
    </Sheet>
  );
}
