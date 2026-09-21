# 📚 Collection Tracker

A private, single-user web app to track your **games, movies, and books**.

- **Frontend:** Vite + React + TypeScript, hosted free on **GitHub Pages**
- **Backend:** **Supabase** (Postgres database + email/password login)
- **Live URL:** https://mercilessrobot.github.io/collection-tracker/

Your data is private to your logged-in account (enforced by Postgres Row Level
Security) and syncs across every device you sign in on.

---

## One-time setup

You only do this once. Steps 1–4 are things only you can do (they involve your
own accounts); the rest is already wired up in this repo.

### 1. Create a free Supabase project

1. Go to <https://supabase.com> and sign up (free).
2. Click **New project**. Give it any name, choose a region near you, and set a
   database password (save it somewhere; you won't need it day-to-day).
3. Wait ~2 minutes for it to finish provisioning.

### 2. Create the database table

1. In your Supabase project, open **SQL Editor → New query**.
2. Copy the entire contents of [`supabase/schema.sql`](supabase/schema.sql),
   paste it in, and click **Run**. You should see “Success”.

### 3. Create your login (and turn off public signups)

1. Go to **Authentication → Users → Add user**.
2. Enter your email and a password. **Check “Auto confirm user.”** Click Create.
   → This is your one and only login.
3. Go to **Authentication → Sign In / Providers** (or **Settings**) and turn
   **off** “Allow new users to sign up.” Now nobody else can create an account.

### 4. Connect the app to Supabase

1. In Supabase, open **Project Settings → API** and copy:
   - **Project URL**
   - the **anon / publishable** key
2. Open [`src/config.ts`](src/config.ts) and paste those two values in place of
   the `PASTE_...` placeholders. (These are safe to commit — the anon key is
   meant to be public; your data is protected by your login + Row Level
   Security, not by hiding this key.)

### 5. Deploy

1. Commit and push these changes to the **`main`** branch.
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source**,
   choose **GitHub Actions**. (This may already be set.)
3. The included workflow (`.github/workflows/deploy.yml`) builds and publishes
   the site automatically on every push to `main`. Watch progress under the
   repo's **Actions** tab.
4. When it finishes, open <https://mercilessrobot.github.io/collection-tracker/>
   and sign in with the account from step 3.

---

## Running it locally (optional)

```bash
npm install
npm run dev
```

Then open the printed URL. It talks to the same Supabase database, so anything
you add locally shows up on the live site too.

---

## Features

- Separate tabs for **Games**, **Movies**, and **Books**, each with a live
  count and search.
- Add / edit / delete items with title, creator, year, status
  (owned · wishlist · in progress · finished), a 0–5 star rating, notes, and a
  cover image.
- **Books:** look up by **ISBN** to auto-fill title, author, year, and cover
  (via the free, keyless Open Library API).
- **Movies:** search by title to auto-fill director, year, and poster (TMDB).
- **Games:** search by title to auto-fill developer, year, and cover (RAWG).
- Installable on your phone's home screen (PWA manifest).

## Optional: enable movie & game auto-lookup

The app works without these (manual entry), but adding two free, read-only API
keys turns on "search to auto-fill" for movies and games. Paste them into
[`src/config.ts`](src/config.ts) next to the Supabase values.

- **Movies — TMDB:** create a free account at
  <https://www.themoviedb.org> → **Settings → API** → request a developer key →
  copy the **"API Key (v3 auth)"** value into `TMDB_API_KEY`.
- **Games — RAWG:** create a free account at <https://rawg.io> → go to
  <https://rawg.io/apidocs> → **Get API Key** → copy it into `RAWG_API_KEY`.

Like the Supabase key, these ship in the front-end and are safe to commit
(read-only public data). Worst case if scraped: someone uses your free quota —
just rotate the key.

> Why TMDB + RAWG (not IGDB)? Both allow direct calls from the browser, so no
> backend is needed. IGDB blocks browser requests and needs a secret, which
> would require a server-side proxy (e.g. a Supabase Edge Function).

## Ideas for later

- Offline support (service worker).
- Import/export (CSV).
