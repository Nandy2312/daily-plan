# Turning on login + sync (Supabase)

Until this is done the app works fully, but everything is saved only on the device you use.

1. **Create a free project** at https://supabase.com (New project → any name, e.g. `daily-plan`, region Mumbai).
2. **Make the table:** Supabase → *SQL Editor* → paste everything in `supabase/schema.sql` → *Run*.
3. **Allow sign-in links back to the app:** *Authentication → URL Configuration*
   - Site URL: `https://nandy2312.github.io/daily-plan/`
   - Redirect URLs: add `https://nandy2312.github.io/daily-plan/` and `http://localhost:5178/`
4. **Copy the two keys:** *Project Settings → API* → `Project URL` and the `anon` `public` key.
   (The anon key is designed to be public; your data is protected by the row rules in step 2.)
5. **Give them to the app:** copy `.env.example` to `.env.local` in this folder and paste the two values
   (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`). `.env.local` is never committed.
6. **Redeploy:** run `npm run deploy` in this folder.

Next time you open the app it asks you to sign in (email link or password). Whatever you already
entered on that phone is uploaded to your account on the first sign-in.
