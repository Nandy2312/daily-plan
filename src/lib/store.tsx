// App state: one document per user. Saved to this device straight away, and to Supabase
// (table user_state) a moment later when the user is signed in.
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";
import { migrateV1, seed, State } from "./model";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase: SupabaseClient | null = URL_ && KEY ? createClient(URL_, KEY) : null;

const LOCAL = "dailyplan.v2";
export type Sync = "local" | "saving" | "synced" | "offline";

function loadLocal(): State {
  try {
    const raw = localStorage.getItem(LOCAL);
    if (raw) return { ...seed(), ...JSON.parse(raw) };
  } catch (e) { /* fresh */ }
  return migrateV1(seed());
}

interface Ctx {
  s: State;
  update: (fn: (d: State) => void) => void;
  replace: (s: State) => void;
  sync: Sync;
  session: Session | null;
  authReady: boolean;
  signOut: () => Promise<void>;
}
const StoreCtx = createContext<Ctx>(null as unknown as Ctx);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(loadLocal);
  const [sync, setSync] = useState<Sync>(supabase ? "saving" : "local");
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const timer = useRef<number>();
  const latest = useRef(s);
  latest.current = s;

  const saveLocal = (st: State) => {
    try { localStorage.setItem(LOCAL, JSON.stringify(st)); } catch (e) { /* storage full */ }
  };

  const push = useCallback(async (st: State, userId: string) => {
    if (!supabase) return;
    setSync("saving");
    const { error } = await supabase.from("user_state").upsert({ user_id: userId, data: st, updated_at: new Date(st.savedAt).toISOString() });
    setSync(error ? "offline" : "synced");
  }, []);

  // pull the newer of (this device, the cloud)
  const pull = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("user_state").select("data, updated_at").eq("user_id", userId).maybeSingle();
    if (error) { setSync("offline"); return; }
    const remote = data?.data as State | undefined;
    if (remote && (remote.savedAt || 0) > (latest.current.savedAt || 0)) {
      const merged = { ...seed(), ...remote };
      setS(merged);
      saveLocal(merged);
      setSync("synced");
    } else {
      push(latest.current.savedAt ? latest.current : { ...latest.current, savedAt: Date.now() }, userId);
    }
  }, [push]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (data.session) pull(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setAuthReady(true);
      if (sess) pull(sess.user.id);
    });
    const onVis = () => {
      if (document.visibilityState === "visible") supabase!.auth.getSession().then(({ data }) => data.session && pull(data.session.user.id));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { sub.subscription.unsubscribe(); document.removeEventListener("visibilitychange", onVis); };
  }, [pull]);

  const commit = useCallback((next: State) => {
    next.savedAt = Date.now();
    setS(next);
    saveLocal(next);
    if (supabase && session) {
      setSync("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => push(latest.current, session.user.id), 1200);
    }
  }, [session, push]);

  const update = useCallback((fn: (d: State) => void) => {
    const draft = structuredClone(latest.current);
    fn(draft);
    commit(draft);
  }, [commit]);

  const replace = useCallback((st: State) => commit({ ...seed(), ...st }), [commit]);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    localStorage.removeItem(LOCAL);
    setS(seed());
  };

  return <StoreCtx.Provider value={{ s, update, replace, sync, session, authReady, signOut }}>{children}</StoreCtx.Provider>;
}
