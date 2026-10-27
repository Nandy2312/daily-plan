# Daily Plan

A personal "plan for every day" app for iPhone, built from the notebook pages:
food, workout, work, dance, money, outings and the new house.

It is an installable web app (PWA): no App Store, no account, no server.
Everything is stored on the phone (localStorage) and works offline.

## Screens
- **Today** — tick off the day's habits (by area), streaks, this week's goals.
- **Week** — 7-day progress, weekly goals (dance video, swim, outing…), habit grid. Tap a day to fill in a missed one.
- **Plan** — one-time decisions (cook akka, savings auto-transfer…), monthly savings vs target, new-house date / must-haves / places seen.
- **Setup** — edit habits and their days, weekly goals, add Calendar reminders (.ics), backup / restore.

## Run locally
```
python3 -m http.server 5178
```
Open http://localhost:5178.

## Put it on the iPhone
It must be served over HTTPS (or opened from the Mac on the same Wi-Fi for a quick try).
Open the URL in Safari → Share → **Add to Home Screen**.

## Notes
- Bump `VERSION` in `sw.js` after changing files so the phone picks up the update.
- Home-screen web apps can't schedule local notifications; reminders go to the iPhone Calendar instead.
- Icons are generated (ruled paper + ink tick); replace files in `icons/` to change them.
