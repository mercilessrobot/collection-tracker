// Movie lookup via TMDB (The Movie Database). Free API token required.
// Uses the v4 "API Read Access Token" sent as a Bearer header (works on the
// v3 endpoints). https://developer.themoviedb.org/reference/search-movie
import { TMDB_API_KEY } from "../config";
import type { LookupResult } from "./lookup";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w185";

export async function searchMovies(query: string): Promise<LookupResult[]> {
  const url = `${BASE}/search/movie?include_adult=false&query=${encodeURIComponent(query)}`;
  const json = await request(url);
  const results = (json.results ?? []) as TmdbMovie[];
  return results.slice(0, 8).map((m) => ({
    title: m.title,
    creator: null, // director is filled in on pick (resolveMovie)
    year: parseYear(m.release_date),
    cover_url: m.poster_path ? IMG + m.poster_path : null,
    sourceId: String(m.id),
  }));
}

// Second call once the user picks a result: fetch the director.
export async function resolveMovie(result: LookupResult): Promise<LookupResult> {
  try {
    const json = await request(`${BASE}/movie/${result.sourceId}/credits`);
    const crew = (json.crew ?? []) as { job: string; name: string }[];
    const directors = crew.filter((c) => c.job === "Director").map((c) => c.name);
    return { ...result, creator: directors.length ? directors.join(", ") : result.creator };
  } catch {
    return result; // details are a nice-to-have; keep the basic fields
  }
}

async function request(url: string): Promise<TmdbResponse> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_API_KEY}`, accept: "application/json" },
  });
  if (res.status === 401) throw new Error("TMDB rejected the API token. Check it in src/config.ts.");
  if (!res.ok) throw new Error(`TMDB request failed (${res.status}).`);
  return res.json();
}

function parseYear(date?: string): number | null {
  return date && date.length >= 4 ? Number(date.slice(0, 4)) : null;
}

interface TmdbResponse {
  results?: TmdbMovie[];
  crew?: { job: string; name: string }[];
}
interface TmdbMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
}
