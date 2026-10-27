import { useState } from "react";
import { supabase } from "../lib/store";
import { Field, Icon } from "../ui/kit";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const redirect = window.location.origin + window.location.pathname;

  const submit = async (e: React.FormEvent, signUp = false) => {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect } });
        setMsg(error ? { text: error.message } : { text: "Check your email and tap the link to sign in.", ok: true });
      } else if (signUp) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } });
        setMsg(error ? { text: error.message } : data.session ? null : { text: "Account made. Check your email to confirm, then sign in.", ok: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMsg({ text: error.message === "Invalid login credentials" ? "That email and password don't match." : error.message });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-inner">
        <span className="login-mark"><Icon name="today" size={34} /></span>
        <h1>Daily Plan</h1>
        <p className="muted">Your calm plan for every day. Sign in so it's saved to your account and the same on every device.</p>
        <form onSubmit={(e) => submit(e)}>
          <Field label="Email"><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></Field>
          {mode === "password" && (
            <Field label="Password"><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></Field>
          )}
          <button className="btn wide" type="submit" disabled={busy}>{busy ? "One moment…" : mode === "magic" ? "Email me a sign-in link" : "Sign in"}</button>
          {mode === "password" && <button className="btn ghost wide" type="button" disabled={busy || password.length < 6} onClick={(e) => submit(e as any, true)}>Create account</button>}
        </form>
        {msg && <p className={`login-msg${msg.ok ? " ok" : ""}`}>{msg.text}</p>}
        <button className="link" onClick={() => { setMode(mode === "magic" ? "password" : "magic"); setMsg(null); }}>
          {mode === "magic" ? "Use a password instead" : "Email me a link instead"}
        </button>
      </div>
    </div>
  );
}
