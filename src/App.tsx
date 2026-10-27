import { createContext, useContext, useEffect, useState } from "react";
import { todayKey } from "./lib/dates";
import { Cat } from "./lib/model";
import { Occ } from "./lib/plan";
import { supabase, useStore } from "./lib/store";
import { Icon } from "./ui/kit";
import { EventDefaults, EventSheet } from "./screens/EventSheet";
import { Today } from "./screens/Today";
import { Calendar } from "./screens/Calendar";
import { Areas, AreaScreen } from "./screens/Areas";
import { Me } from "./screens/Me";
import { Login } from "./screens/Login";
import { Welcome } from "./screens/Welcome";

export type Tab = "today" | "calendar" | "areas" | "me";

interface Nav {
  tab: Tab;
  go: (t: Tab) => void;
  openArea: (c: Cat | null) => void;
  addEvent: (d?: EventDefaults) => void;
  editEvent: (o: Occ) => void;
  showDay: (date: string) => void; // open the calendar on a day
  calDate: string;
  setCalDate: (d: string) => void;
}
const NavCtx = createContext<Nav>(null as unknown as Nav);
export const useNav = () => useContext(NavCtx);

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "today" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "areas", label: "Areas", icon: "areas" },
  { id: "me", label: "Me", icon: "me" },
];

export default function App() {
  const { s, session, authReady } = useStore();
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem("dailyplan.tab") as Tab) || "today");
  const [area, setArea] = useState<Cat | null>(null);
  const [calDate, setCalDate] = useState(todayKey());
  const [sheet, setSheet] = useState<{ occ?: Occ; defaults?: EventDefaults } | null>(null);

  useEffect(() => { try { localStorage.setItem("dailyplan.tab", tab); } catch (e) { /* ignore */ } }, [tab]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab, area]);

  if (supabase && !authReady) return <div className="splash"><Icon name="spark" size={40} /></div>;
  if (supabase && !session) return <Login />;
  if (!s.welcomed) return <Welcome />;

  const nav: Nav = {
    tab,
    go: (t) => { setArea(null); setTab(t); if (t === "calendar") setCalDate(todayKey()); },
    openArea: (c) => { setArea(c); if (c) setTab("areas"); },
    addEvent: (defaults) => setSheet({ defaults }),
    editEvent: (occ) => setSheet({ occ }),
    showDay: (d) => { setCalDate(d); setArea(null); setTab("calendar"); },
    calDate,
    setCalDate,
  };

  return (
    <NavCtx.Provider value={nav}>
      <main className="screen" key={tab + (area || "")}>
        {tab === "today" && <Today />}
        {tab === "calendar" && <Calendar />}
        {tab === "areas" && (area ? <AreaScreen cat={area} /> : <Areas />)}
        {tab === "me" && <Me />}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} aria-current={tab === t.id ? "page" : undefined}
            onClick={() => (tab === t.id && t.id === "areas" ? setArea(null) : nav.go(t.id))}>
            <Icon name={t.icon} size={24} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <EventSheet open={!!sheet} occ={sheet?.occ} defaults={sheet?.defaults} onClose={() => setSheet(null)} />
    </NavCtx.Provider>
  );
}
