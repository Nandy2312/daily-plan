import { useRef, useState } from "react";
import { todayKey } from "../lib/dates";
import { Ev, State } from "../lib/model";
import { supabase, useStore } from "../lib/store";
import { Field, Icon, Sheet, useToast } from "../ui/kit";

const standalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);

function icsFor(events: Ev[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const dt = (d: string, t: string) => d.replace(/-/g, "") + "T" + t.replace(":", "") + "00";
  const rule: Record<string, string> = {
    daily: "FREQ=DAILY", weekdays: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", weekends: "FREQ=WEEKLY;BYDAY=SA,SU", weekly: "FREQ=WEEKLY",
  };
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Daily Plan//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    if (e.repeat === "none" && e.date < todayKey()) continue;
    lines.push("BEGIN:VEVENT", `UID:${e.id}@dailyplan`, `DTSTAMP:${stamp}`, `DTSTART:${dt(e.date, e.start)}`, `DTEND:${dt(e.date, e.end)}`, `SUMMARY:${e.title.replace(/[,;]/g, " ")}`);
    if (e.repeat !== "none") lines.push(`RRULE:${rule[e.repeat]}`);
    for (const sk of e.skip || []) lines.push(`EXDATE:${dt(sk, e.start)}`);
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${e.title.replace(/[,;]/g, " ")}`, "TRIGGER:-PT10M", "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

async function shareOrDownload(text: string, name: string, type: string) {
  const file = new File([text], name, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e: any) { if (e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function Me() {
  const { s, update, replace, sync, session, signOut } = useStore();
  const toast = useToast();
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState(s.name);
  const [resetOpen, setResetOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const syncText = !supabase ? "Saved on this device only" : sync === "synced" ? "Synced to your account" : sync === "saving" ? "Saving…" : "Offline — will sync when back online";

  return (
    <>
      <header className="page-head"><div><p className="eyebrow">Settings</p><h1>Me</h1></div></header>

      <div className="card">
        <button className="list-row" onClick={() => { setName(s.name); setNameOpen(true); }}>
          <span className="label"><b>{s.name || "Add your name"}</b><small>Used for the greeting</small></span><Icon name="right" size={18} className="muted" />
        </button>
        <div className="list-row">
          <span className={`sync-dot ${supabase ? sync : "local"}`} />
          <span className="label"><b>{session?.user.email || "No account connected"}</b><small>{syncText}</small></span>
          {session && <button className="btn small ghost" onClick={signOut}>Sign out</button>}
        </div>
      </div>
      {!supabase && <p className="tiny muted pad-x">Login and sync turn on once the app is connected to Supabase (see SETUP.md in the project).</p>}

      <div className="section-head"><h2>Reminders</h2></div>
      <div className="card pad">
        <p className="muted" style={{ marginTop: 0 }}>Sends your calendar to the iPhone Calendar app with an alert 10 minutes before each item — so your phone reminds you even when this app is closed.</p>
        <button className="btn wide" onClick={() => shareOrDownload(icsFor(s.events), "daily-plan.ics", "text/calendar")}><Icon name="calendar" size={20} />Add reminders to iPhone Calendar</button>
        <p className="tiny muted">After big changes, send it again. Old copies can be deleted in the Calendar app.</p>
      </div>

      <div className="section-head"><h2>Backup</h2></div>
      <div className="card pad">
        <div className="row">
          <button className="btn ghost" onClick={() => shareOrDownload(JSON.stringify(s, null, 2), `daily-plan-backup-${todayKey()}.json`, "application/json")}>Save backup</button>
          <button className="btn ghost" onClick={() => file.current?.click()}>Restore</button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          f.text().then((txt) => {
            try {
              const data = JSON.parse(txt) as State;
              if (!Array.isArray(data.events)) throw new Error("not a v2 backup");
              replace(data);
              toast("Backup restored");
            } catch (err) { toast("That file isn't a Daily Plan backup"); }
          });
          e.target.value = "";
        }} />
      </div>

      {!standalone && (
        <>
          <div className="section-head"><h2>Put it on your home screen</h2></div>
          <div className="card pad">
            <ol className="steps">
              <li>Open this page in <b>Safari</b>.</li>
              <li>Tap <b>Share</b>, then <b>Add to Home Screen</b>.</li>
              <li>Open Daily Plan from the new icon.</li>
            </ol>
          </div>
        </>
      )}

      <div className="section-head"><h2>Help</h2></div>
      <div className="card">
        <button className="list-row" onClick={() => update((d) => { d.welcomed = false; })}><span className="label"><b>Show the welcome again</b></span><Icon name="right" size={18} className="muted" /></button>
        <button className="list-row" onClick={() => setResetOpen(true)}><span className="label"><b className="bad">Start over</b><small>Clears everything</small></span></button>
      </div>
      <p className="tiny muted center">Daily Plan · v2</p>

      <Sheet open={nameOpen} title="Your name" onClose={() => setNameOpen(false)} onSave={() => { update((d) => { d.name = name.trim(); }); setNameOpen(false); }}>
        <Field label="What should the app call you?"><input type="text" value={name} autoComplete="given-name" onChange={(e) => setName(e.target.value)} /></Field>
      </Sheet>
      <Sheet open={resetOpen} title="Start over?" saveLabel="Start over" onClose={() => setResetOpen(false)} onSave={() => {
        const keepName = s.name;
        import("../lib/model").then(({ seed }) => { const fresh = seed(); fresh.name = keepName; fresh.welcomed = true; replace(fresh); });
        setResetOpen(false);
        toast("Fresh start");
      }}>
        <p className="muted">This clears your calendar, ticks, money and notes{session ? " on every device" : ""}. Save a backup first if you might want them.</p>
      </Sheet>
    </>
  );
}
