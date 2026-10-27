import { useEffect, useState } from "react";
import { addMonths, fmtMonth, monthKey, parse, relDay, todayKey, uid } from "../lib/dates";
import { BudgetCat, CAT_LIST, Expense, SaveGoal } from "../lib/model";
import { monthExpenses, rupees, spendable, sum } from "../lib/plan";
import { useStore } from "../lib/store";
import { CatChips, catStyle, Empty, Field, Icon, MoneyInput, Sheet, useToast } from "../ui/kit";
import { OnCalendar } from "./Areas";

export function Money() {
  const { s } = useStore();
  const t = todayKey();
  const nowMk = monthKey(t);
  const [mk, setMk] = useState(nowMk);
  const [exp, setExp] = useState<Expense | "new" | null>(null);
  const [cat, setCat] = useState<BudgetCat | "new" | null>(null);
  const [goal, setGoal] = useState<SaveGoal | "new" | null>(null);
  const [incomeOpen, setIncomeOpen] = useState(false);

  const m = s.money;
  const exps = monthExpenses(s, mk).slice().reverse().sort((a, b) => b.date.localeCompare(a.date));
  const spent = sum(exps, (e) => e.amount);
  const plan = spendable(s);
  const left = plan - spent;
  const budgeted = sum(m.categories, (c) => c.budget);
  const daysLeft = new Date(parse(t).getFullYear(), parse(t).getMonth() + 1, 0).getDate() - parse(t).getDate() + 1;
  const byCat: Record<string, number> = {};
  for (const e of exps) byCat[e.catId] = (byCat[e.catId] || 0) + e.amount;

  const months = Array.from({ length: 6 }, (_, i) => addMonths(nowMk, i - 5));
  const spentBy = months.map((x) => sum(monthExpenses(s, x), (e) => e.amount));
  const maxV = Math.max(plan, ...spentBy, 1);

  return (
    <>
      <div className="day-switch">
        <button className="icon-btn" onClick={() => setMk(addMonths(mk, -1))} aria-label="Previous month"><Icon name="left" /></button>
        <b>{fmtMonth(mk)}</b>
        <button className="icon-btn" onClick={() => setMk(addMonths(mk, 1))} disabled={mk === nowMk} aria-label="Next month"><Icon name="right" /></button>
      </div>

      {plan ? (
        <div className={`card money-hero${left < 0 ? " over" : ""}`}>
          <small>{left >= 0 ? "Left to spend" : "Over budget by"}</small>
          <div className="big-num">{rupees(Math.abs(left))}</div>
          <div className="meter"><i style={{ width: `${Math.min(100, (spent / plan) * 100)}%` }} /></div>
          <div className="hero-split"><span>Spent {rupees(spent)}</span><span>Budget {rupees(plan)}</span></div>
          {mk === nowMk && left > 0 && <p className="muted">About <b>{rupees(Math.floor(left / daysLeft))} a day</b> for the next {daysLeft} days.</p>}
        </div>
      ) : (
        <div className="card money-hero">
          <small>Spent in {fmtMonth(mk, { month: "long" })}</small>
          <div className="big-num">{rupees(spent)}</div>
          <p className="muted">Add your income and a budget per category to see what's left.</p>
          <button className="btn small" onClick={() => setIncomeOpen(true)}>Set up my budget</button>
        </div>
      )}
      <button className="btn wide" onClick={() => setExp("new")}><Icon name="plus" size={20} />Add spending</button>

      <div className="section-head"><h2>Where it's going</h2><small className="muted">tap to set a budget</small></div>
      <div className="card">
        {m.categories.map((c) => {
          const sp = byCat[c.id] || 0;
          const l = c.budget - sp;
          return (
            <button key={c.id} className="list-row cat" style={catStyle(c.color)} onClick={() => setCat(c)}>
              <span className="dot" />
              <span className="label">
                <b>{c.name}</b>
                <small>{c.budget ? `${rupees(sp)} of ${rupees(c.budget)}` : sp ? `${rupees(sp)} · no budget yet` : "no budget yet"}</small>
                {c.budget > 0 && <span className="mini"><i className={l < 0 ? "bad" : ""} style={{ width: `${Math.min(100, (sp / c.budget) * 100)}%` }} /></span>}
              </span>
              {c.budget ? <span className={`amt${l < 0 ? " bad" : ""}`}>{rupees(Math.abs(l))}<small>{l < 0 ? "over" : "left"}</small></span>
                : <span className="amt muted">Set</span>}
            </button>
          );
        })}
        <button className="add-row" onClick={() => setCat("new")}><Icon name="plus" size={18} /> Add a category</button>
      </div>

      <div className="section-head"><h2>Income &amp; plan</h2></div>
      <div className="card">
        <button className="list-row" onClick={() => setIncomeOpen(true)}>
          <span className="label">
            <b>{m.income ? `${rupees(m.income)} a month` : "Add your monthly income"}</b>
            <small>{m.income
              ? `Save ${rupees(m.saveTarget)} · budgeted ${rupees(budgeted)} · ${m.income - m.saveTarget - budgeted >= 0 ? `${rupees(m.income - m.saveTarget - budgeted)} not planned yet` : `${rupees(budgeted + m.saveTarget - m.income)} more planned than you earn`}`
              : "Then the app can show what's free to plan"}</small>
          </span>
          <Icon name="right" size={18} className="muted" />
        </button>
      </div>

      <div className="section-head"><h2>Savings &amp; investing</h2></div>
      <div className="card">
        {m.goals.map((g) => (
          <button key={g.id} className="list-row cat" style={catStyle("money")} onClick={() => setGoal(g)}>
            <span className="label">
              <b>{g.name}</b>
              <small>{g.target ? `${rupees(g.saved)} of ${rupees(g.target)}` : `${rupees(g.saved)} saved · set a target`}</small>
              {g.target > 0 && <span className="mini"><i style={{ width: `${Math.min(100, (g.saved / g.target) * 100)}%` }} /></span>}
            </span>
            {g.target > 0 && <span className="amt">{Math.round((g.saved / g.target) * 100)}%</span>}
          </button>
        ))}
        <button className="add-row" onClick={() => setGoal("new")}><Icon name="plus" size={18} /> Add a goal</button>
      </div>

      <div className="section-head"><h2>Last 6 months</h2><small className="muted">spending</small></div>
      <div className="card bars-card">
        <div className="bars">
          {months.map((x, i) => (
            <div key={x}>
              <span className="bar-val">{spentBy[i] ? `${Math.round(spentBy[i] / 1000)}k` : ""}</span>
              <i className={plan && spentBy[i] > plan ? "bad" : ""} style={{ height: `${(spentBy[i] / maxV) * 80}px` }} />
              {fmtMonth(x, { month: "short" })}
            </div>
          ))}
        </div>
      </div>

      <div className="section-head"><h2>Spending</h2><small className="muted">{exps.length} item{exps.length === 1 ? "" : "s"}</small></div>
      <div className="card">
        {exps.map((e) => {
          const c = m.categories.find((x) => x.id === e.catId);
          return (
            <button key={e.id} className="list-row" style={catStyle(c?.color || "home")} onClick={() => setExp(e)}>
              <span className="dot" />
              <span className="label"><b>{e.note || c?.name || "Uncategorised"}</b><small>{relDay(e.date)}{e.note ? ` · ${c?.name || ""}` : ""}</small></span>
              <span className="amt">{rupees(e.amount)}</span>
            </button>
          );
        })}
        {!exps.length && <Empty>Nothing added for {fmtMonth(mk, { month: "long" })} yet.</Empty>}
      </div>

      <OnCalendar cat="money" title="Money check-ins" />

      <ExpenseSheet value={exp} onClose={() => setExp(null)} />
      <CategorySheet value={cat} onClose={() => setCat(null)} />
      <GoalSheet value={goal} onClose={() => setGoal(null)} />
      <IncomeSheet open={incomeOpen} onClose={() => setIncomeOpen(false)} />
    </>
  );
}

export function ExpenseSheet({ value, onClose }: { value: Expense | "new" | null; onClose: () => void }) {
  const { s, update } = useStore();
  const toast = useToast();
  const isNew = value === "new";
  const [f, setF] = useState({ amount: "", catId: "", note: "", date: todayKey() });
  useEffect(() => {
    if (!value) return;
    if (value === "new") {
      const last = s.money.expenses[s.money.expenses.length - 1];
      setF({ amount: "", catId: last?.catId || s.money.categories[0]?.id || "", note: "", date: todayKey() });
    } else setF({ amount: String(value.amount), catId: value.catId, note: value.note, date: value.date });
  }, [value]);

  const save = () => {
    const amount = Math.round(Number(f.amount) * 100) / 100;
    if (!(amount > 0)) { toast("Type the amount first"); return; }
    if (!f.catId) { toast("Pick what it was for"); return; }
    const data = { amount, catId: f.catId, note: f.note.trim(), date: f.date || todayKey() };
    let after = 0;
    update((d) => {
      if (isNew) d.money.expenses.push({ id: uid(), ...data });
      else Object.assign(d.money.expenses.find((x) => x.id === (value as Expense).id)!, data);
      const c = d.money.categories.find((x) => x.id === data.catId)!;
      after = c.budget - sum(d.money.expenses.filter((x) => x.catId === c.id && x.date.startsWith(data.date.slice(0, 7))), (x) => x.amount);
    });
    const c = s.money.categories.find((x) => x.id === data.catId)!;
    toast(c.budget ? (after >= 0 ? `${rupees(after)} left for ${c.name}` : `${c.name} is ${rupees(-after)} over`) : "Added");
    onClose();
  };

  return (
    <Sheet open={!!value} title={isNew ? "Add spending" : "Edit spending"} saveLabel={isNew ? "Add" : "Save"} onClose={onClose} onSave={save}>
      <div className="field"><span>How much?</span><MoneyInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} autoFocus={isNew} /></div>
      <div className="field"><span>On what?</span>
        <div className="chips">
          {s.money.categories.map((c) => (
            <button type="button" key={c.id} className={`chip${f.catId === c.id ? " on" : ""}`} style={catStyle(c.color)} onClick={() => setF({ ...f, catId: c.id })}>{c.name}</button>
          ))}
        </div>
      </div>
      <Field label="Note (optional)"><input type="text" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Vegetables, auto to class" /></Field>
      <Field label="Date"><input type="date" value={f.date} max={todayKey()} onChange={(e) => e.target.value && setF({ ...f, date: e.target.value })} /></Field>
      {!isNew && <button type="button" className="btn danger wide" onClick={() => {
        const x = value as Expense;
        update((d) => { d.money.expenses = d.money.expenses.filter((y) => y.id !== x.id); });
        toast("Deleted", () => update((d) => { d.money.expenses.push(x); }));
        onClose();
      }}>Delete</button>}
    </Sheet>
  );
}

function CategorySheet({ value, onClose }: { value: BudgetCat | "new" | null; onClose: () => void }) {
  const { s, update } = useStore();
  const toast = useToast();
  const isNew = value === "new";
  const [f, setF] = useState({ name: "", budget: "", color: "money" as BudgetCat["color"] });
  useEffect(() => {
    if (!value) return;
    if (value === "new") setF({ name: "", budget: "", color: CAT_LIST[s.money.categories.length % CAT_LIST.length] });
    else setF({ name: value.name, budget: value.budget ? String(value.budget) : "", color: value.color });
  }, [value]);
  const spentNow = value && value !== "new" ? sum(monthExpenses(s, monthKey(todayKey())).filter((x) => x.catId === value.id), (x) => x.amount) : 0;
  return (
    <Sheet open={!!value} title={isNew ? "New category" : "Category"} saveLabel={isNew ? "Add" : "Save"} onClose={onClose} onSave={() => {
      if (!f.name.trim()) { toast("Give it a name first"); return; }
      const data = { name: f.name.trim(), budget: Math.max(0, Number(f.budget) || 0), color: f.color };
      update((d) => {
        if (isNew) d.money.categories.push({ id: uid(), ...data });
        else Object.assign(d.money.categories.find((x) => x.id === (value as BudgetCat).id)!, data);
      });
      onClose();
    }}>
      <Field label="Name"><input type="text" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Gifts" /></Field>
      <div className="field"><span>Budget for a month</span><MoneyInput value={f.budget} onChange={(v) => setF({ ...f, budget: v })} autoFocus={!isNew} /></div>
      <div className="field"><span>Colour</span><CatChips value={f.color} onChange={(c) => setF({ ...f, color: c })} /></div>
      {!isNew && <p className="muted">Spent {rupees(spentNow)} on this so far this month.</p>}
      {!isNew && <button type="button" className="btn danger wide" onClick={() => {
        const x = value as BudgetCat;
        update((d) => { d.money.categories = d.money.categories.filter((y) => y.id !== x.id); });
        toast("Category deleted", () => update((d) => { d.money.categories.push(x); }));
        onClose();
      }}>Delete</button>}
    </Sheet>
  );
}

function GoalSheet({ value, onClose }: { value: SaveGoal | "new" | null; onClose: () => void }) {
  const { update } = useStore();
  const toast = useToast();
  const isNew = value === "new";
  const [f, setF] = useState({ name: "", target: "", saved: "", add: "" });
  useEffect(() => {
    if (!value) return;
    if (value === "new") setF({ name: "", target: "", saved: "", add: "" });
    else setF({ name: value.name, target: value.target ? String(value.target) : "", saved: String(value.saved || ""), add: "" });
  }, [value]);
  return (
    <Sheet open={!!value} title={isNew ? "New savings goal" : "Savings goal"} saveLabel={isNew ? "Add" : "Save"} onClose={onClose} onSave={() => {
      if (!f.name.trim()) { toast("Name the goal first"); return; }
      const saved = (Number(f.saved) || 0) + (Number(f.add) || 0);
      const data = { name: f.name.trim(), target: Math.max(0, Number(f.target) || 0), saved: Math.max(0, saved) };
      update((d) => {
        if (isNew) d.money.goals.push({ id: uid(), ...data });
        else Object.assign(d.money.goals.find((x) => x.id === (value as SaveGoal).id)!, data);
      });
      if (Number(f.add) > 0) toast(`Added ${rupees(Number(f.add))} to ${data.name}`);
      onClose();
    }}>
      <Field label="Goal"><input type="text" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Emergency fund, SIP, new laptop" /></Field>
      <div className="field"><span>Target</span><MoneyInput value={f.target} onChange={(v) => setF({ ...f, target: v })} /></div>
      {isNew ? (
        <div className="field"><span>Already saved</span><MoneyInput value={f.saved} onChange={(v) => setF({ ...f, saved: v })} /></div>
      ) : (
        <>
          <p className="muted">Saved so far: <b>{rupees(Number(f.saved) || 0)}</b></p>
          <div className="field"><span>Add to it now</span><MoneyInput value={f.add} onChange={(v) => setF({ ...f, add: v })} autoFocus /></div>
          <button type="button" className="btn danger wide" onClick={() => {
            const x = value as SaveGoal;
            update((d) => { d.money.goals = d.money.goals.filter((y) => y.id !== x.id); });
            toast("Goal deleted", () => update((d) => { d.money.goals.push(x); }));
            onClose();
          }}>Delete</button>
        </>
      )}
    </Sheet>
  );
}

function IncomeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, update } = useStore();
  const [f, setF] = useState({ income: "", save: "" });
  useEffect(() => { if (open) setF({ income: s.money.income ? String(s.money.income) : "", save: s.money.saveTarget ? String(s.money.saveTarget) : "" }); }, [open]);
  return (
    <Sheet open={open} title="Monthly plan" onClose={onClose} onSave={() => {
      update((d) => { d.money.income = Math.max(0, Number(f.income) || 0); d.money.saveTarget = Math.max(0, Number(f.save) || 0); });
      onClose();
    }}>
      <div className="field"><span>Money coming in each month</span><MoneyInput value={f.income} onChange={(v) => setF({ ...f, income: v })} autoFocus /></div>
      <div className="field"><span>Put aside for savings first</span><MoneyInput value={f.save} onChange={(v) => setF({ ...f, save: v })} /></div>
      <p className="muted">Then give each category a budget. Anything not planned yet shows up so you can decide where it goes.</p>
    </Sheet>
  );
}
