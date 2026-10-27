# Daily Plan

A calm daily system for Food, Workout, Work, Dance, Money, Outings and Home — one person, phone first.

Live: https://nandy2312.github.io/daily-plan/ (add it to the iPhone home screen from Safari).

## What's inside
- **Today** — today's plan with big ticks, now/next, one gentle suggestion, a tile per area (auto-ticks when you finish something in that area), tomorrow at a glance.
- **Calendar** — Day / Week / Month, colour per area, ready-made templates, tap an empty time to add, hold-and-drag to move (a repeating item moves for that day only, with Undo), swipe to change day/week, simple repeats (every day, weekdays, weekends, every <day>).
- **Areas** — each area shows its calendar items for the next 7 days plus its own tools:
  Food (meals, cooking myself / cook akka, energy note) · Workout (quick-start timer, log, streak) ·
  Work (apps / learning / portfolio tasks, learning log) · Dance (weekly practice goal, content ideas) ·
  Money (spending vs budget per category, what's left per day, savings goals, 6-month view) ·
  Outings (this week's outing, recent ones) · Home (move countdown, checklist, places seen).
- **Me** — account + sync status, send the calendar to the iPhone Calendar (alerts), backup / restore.

## Stack
React 18 + Vite + TypeScript. Supabase (auth + one `user_state` row per user, row-level security) — optional; without keys the app runs on-device only. Offline via a small service worker. Deployed with `npm run deploy` (builds, then commits `dist/` to the `gh-pages` branch that Pages serves).

## Develop
```
npm install
npm run dev      # http://localhost:5178
npm run build
npm run deploy   # publish to GitHub Pages
```
Login/sync setup: see [SETUP.md](SETUP.md). The first version (plain JS) is kept in `v1-archive/`; its data is imported automatically on first open.
