# Turning on login + sync (Supabase)

Until this is done the app works fully, but everything is saved only on the device you use.

1. **Create a free project** at https://supabase.com (New project → any name, e.g. `daily-plan`, region Mumbai).
2. **Make the table:** Supabase → *SQL Editor* → paste everything in `supabase/schema.sql` → *Run*.
3. **Allow sign-in links back to the app:** *Authentication → URL Configuration*
   - Site URL: `https://nandy2312.github.io/daily-plan/`
   - Redirect URLs: add `https://nandy2312.github.io/daily-plan/` and `http://localhost:5178/`
4. **Copy the two keys:** *Project Settings → API* → `Project URL` and the `anon` `public` key.
   (The anon key is designed to be public; your data is protected by the row rules in step 2.)
5. **Give them to the build:** GitHub → `Nandy2312/daily-plan` → *Settings → Secrets and variables → Actions → New repository secret*:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon key
6. **Redeploy:** GitHub → *Actions → Deploy to GitHub Pages → Run workflow* (or push any change).

Next time you open the app it asks you to sign in (email link or password). Whatever you already
entered on that phone is uploaded to your account on the first sign-in.

For local development, copy `.env.example` to `.env.local` and fill in the same two values.
