import { useState } from "react";
import { CAT_LIST, CATS } from "../lib/model";
import { useStore } from "../lib/store";
import { catStyle, Field, Icon } from "../ui/kit";

export function Welcome() {
  const { s, update } = useStore();
  const [name, setName] = useState(s.name);
  return (
    <div className="login welcome">
      <div className="login-inner">
        <span className="login-mark"><Icon name="today" size={34} /></span>
        <h1>A calm plan for every day</h1>
        <div className="welcome-cats">
          {CAT_LIST.map((c) => <span key={c} style={catStyle(c)}><Icon name={c} size={18} />{CATS[c].label}</span>)}
        </div>
        <ol className="how">
          <li><b>Today</b><span>Your plan at a glance. Tick things off as you go.</span></li>
          <li><b>Calendar</b><span>Tap a time to add. Pick a ready-made template. Hold and drag to move.</span></li>
          <li><b>Areas</b><span>Food, workout, work, dance, money, outings and home — each with its own simple page.</span></li>
        </ol>
        <p className="muted">A starter week is already on your calendar — workouts, deep work, dance practice. Change anything.</p>
        <Field label="What should I call you?"><input type="text" value={name} autoComplete="given-name" placeholder="Your name (optional)" onChange={(e) => setName(e.target.value)} /></Field>
        <button className="btn wide" onClick={() => update((d) => { d.name = name.trim(); d.welcomed = true; })}>Let's start</button>
      </div>
    </div>
  );
}
