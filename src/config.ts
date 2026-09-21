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
