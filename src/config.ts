// ---------------------------------------------------------------------------
// SUPABASE CONNECTION SETTINGS
// ---------------------------------------------------------------------------
// Paste the two values from your Supabase project here.
// Find them in the Supabase dashboard:  Project Settings -> API
//   * SUPABASE_URL           -> "Project URL"
//   * SUPABASE_PUBLISHABLE_KEY -> the "anon" / "publishable" key
//
// These two values are SAFE to commit publicly. The anon/publishable key is
// designed to ship in front-end code; your data is protected by Row Level
// Security + your login, not by hiding this key.
// ---------------------------------------------------------------------------

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://rxssixlirkffgsimzuej.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_wmutiihmanDE3LMWyyPh5Q_euHp0GyK";

export const isConfigured =
  !SUPABASE_URL.startsWith("PASTE_") && !SUPABASE_PUBLISHABLE_KEY.startsWith("PASTE_");

// ---------------------------------------------------------------------------
// OPTIONAL: METADATA LOOKUP KEYS (movies + games)
// ---------------------------------------------------------------------------
// These enable "search to auto-fill" when adding a movie or game. They are
// optional — the app works without them (manual entry). Both are free.
//   * TMDB  (movies) -> https://www.themoviedb.org -> Settings -> API
//                       (use the "API Read Access Token", the long eyJ... token)
//   * RAWG  (games)  -> https://rawg.io/apidocs     -> Get API Key
//
// Like the Supabase key, these are read-only public-data keys and are OK to
// ship in front-end code. Worst case if scraped: someone uses your free quota;
// you can rotate the key anytime.
// ---------------------------------------------------------------------------

export const TMDB_API_KEY =
  import.meta.env.VITE_TMDB_KEY ??
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhMzdiNDgyZTk3ZDExZTRiOTFjNmUxYWYyMWQxODhhNSIsIm5iZiI6MTc5MDAwOTY3MC40ODcsInN1YiI6IjZhYjE2MTQ2MTQzYThkN2RlMzljOTJkZiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.cDHVxP3LOXJTDruXspse-Tm1e6QAyX0pqh5ctM_b4Wk";

export const RAWG_API_KEY =
  import.meta.env.VITE_RAWG_KEY ?? "f6c32dd72cef4d128dec429328804a0d";

export const hasTmdb = !TMDB_API_KEY.startsWith("PASTE_");
export const hasRawg = !RAWG_API_KEY.startsWith("PASTE_");
