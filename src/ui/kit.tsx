import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CAT_LIST, CATS, Cat } from "../lib/model";

/* ---------- icons (stroke, currentColor) ---------- */

const P: Record<string, string> = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  today: "M4 12.5l5 5L20 6.5",
  calendar: "M4 6.5h16v13.5H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4",
  areas: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5",
  plus: "M12 5v14M5 12h14",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  close: "M6 6l12 12M18 6L6 18",
  play: "M8 5.5v13l10.5-6.5z",
  pause: "M8 5v14M16 5v14",
  trash: "M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
  food: "M7 3v8a3 3 0 0 0 3 3v7M10 3v6M4 3v6a3 3 0 0 0 3 3M17 21V3c-2.2 1.2-3.5 3.6-3.5 7 0 2 1.2 3 3.5 3",
  workout: "M3 9v6M6.5 6.5v11M17.5 6.5v11M21 9v6M6.5 12h11",
  work: "M4 7.5h16v12H4zM9 7.5V5h6v2.5M4 12.5h16",
  dance: "M14 4.5a1.8 1.8 0 1 0 0 .1M12.5 8l-3 5 3.5 2-1.5 5.5M12.5 8l3.5 3 3-1M9.5 13L6 15",
  money: "M7 4h11M7 8.5h11M7 4h3.5a4.5 4.5 0 0 1 0 9H8l8 7",
  outings: "M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11zM12 12a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z",
  home: "M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5M10 20v-5.5h4V20",
  sync: "M20 11a8 8 0 0 0-14.5-4.5M4 13a8 8 0 0 0 14.5 4.5M5 3v4h4M19 21v-4h-4",
  timer: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M10 2.5h4",
  repeat: "M17 2.5l3 3-3 3M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3M20 12.5v1a5 5 0 0 1-5 5H4",
};
export function Icon({ name, size = 22, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={P[name] || ""} />
    </svg>
  );
}

/* ---------- small pieces ---------- */

export const catStyle = (cat: Cat) => ({ "--c": `var(--${cat})`, "--ct": `var(--${cat}-t)` }) as React.CSSProperties;

export function Tick({ on, onClick, cat, label, big }: { on: boolean; onClick: () => void; cat?: Cat; label: string; big?: boolean }) {
  return (
    <button type="button" className={`tick${on ? " on" : ""}${big ? " big" : ""}`} style={cat ? catStyle(cat) : undefined}
      onClick={(e) => { e.stopPropagation(); onClick(); }} aria-pressed={on} aria-label={label}>
      <Icon name="check" size={big ? 22 : 18} />
    </button>
  );
}

export function Ring({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(value * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="track" />
      <circle cx={size / 2} cy={size / 2} r={r} className="fill" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} />
      <text x="50%" y="50%" dy=".35em" textAnchor="middle">{label ?? `${Math.round(value * 100)}%`}</text>
    </svg>
  );
}

export function CatChips({ value, onChange, cats = CAT_LIST }: { value: Cat; onChange: (c: Cat) => void; cats?: Cat[] }) {
  return (
    <div className="chips">
      {cats.map((c) => (
        <button type="button" key={c} className={`chip${c === value ? " on" : ""}`} style={catStyle(c)} onClick={() => onChange(c)}>
          {CATS[c].label}
        </button>
      ))}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button type="button" key={o.id} role="tab" aria-selected={o.id === value} className={o.id === value ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/* ---------- bottom sheet ---------- */

export function Sheet({ open, title, onClose, onSave, saveLabel = "Save", children, tall }: {
  open: boolean; title: string; onClose: () => void; onSave?: () => void; saveLabel?: string; children: ReactNode; tall?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      document.body.classList.add("locked");
    } else if (mounted) {
      setShown(false);
      document.body.classList.remove("locked");
      const t = setTimeout(() => setMounted(false), 260);
      return () => clearTimeout(t);
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className={`sheet${shown ? " open" : ""}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <form className={`sheet-panel${tall ? " tall" : ""}`} role="dialog" aria-modal="true" aria-label={title}
        onSubmit={(e) => { e.preventDefault(); onSave?.(); }}>
        <div className="grab" />
        <div className="sheet-head">
          <button type="button" className="link muted" onClick={onClose}>{onSave ? "Cancel" : "Close"}</button>
          <strong>{title}</strong>
          {onSave ? <button type="submit" className="link strong">{saveLabel}</button> : <span style={{ width: 44 }} />}
        </div>
        <div className="sheet-body">{children}</div>
      </form>
    </div>,
    document.body,
  );
}

/* ---------- toast with optional Undo ---------- */

type ToastFn = (msg: string, undo?: () => void) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; undo?: () => void; id: number } | null>(null);
  const timer = useRef<number>();
  const show: ToastFn = (msg, undo) => {
    setT({ msg, undo, id: Date.now() });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setT(null), undo ? 5000 : 2200);
  };
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={`toast${t ? " show" : ""}`} role="status">
        {t && <span>{t.msg}</span>}
        {t?.undo && <button type="button" onClick={() => { t.undo!(); setT(null); }}>Undo</button>}
      </div>
    </ToastCtx.Provider>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function MoneyInput({ value, onChange, autoFocus }: { value: number | string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="amount-box">
      <b>₹</b>
      <input type="number" inputMode="decimal" min="0" step="any" value={value} placeholder="0" autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
