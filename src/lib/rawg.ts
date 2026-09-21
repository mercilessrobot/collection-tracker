// Game lookup via RAWG. Free API key required, works from the browser.
// https://api.rawg.io/docs/
import { RAWG_API_KEY } from "../config";
import type { LookupResult } from "./lookup";

const BASE = "https://api.rawg.io/api";

export async function searchGames(query: string): Promise<LookupResult[]> {
  const url = `${BASE}/games?key=${RAWG_API_KEY}&page_size=8&search=${encodeURIComponent(query)}`;
  const json = await request(url);
  const results = (json.results ?? []) as RawgGame[];
  return results.map((g) => ({
    title: g.name,
    // Fallback to platforms; developer name is filled in on pick (resolveGame).
    creator: platformNames(g),
    year: parseYear(g.released),
    cover_url: g.background_image ?? null,
    sourceId: String(g.id),
  }));
}

// Second call once the user picks a result: fetch the developer.
export async function resolveGame(result: LookupResult): Promise<LookupResult> {
  try {
    const url = `${BASE}/games/${result.sourceId}?key=${RAWG_API_KEY}`;
    const json = (await request(url)) as RawgGame;
    const devs = (json.developers ?? []).map((d) => d.name);
    return { ...result, creator: devs.length ? devs.slice(0, 2).join(", ") : result.creator };
  } catch {
    return result;
  }
}

async function request(url: string): Promise<RawgResponse & RawgGame> {
  const res = await fetch(url);
  if (res.status === 401) throw new Error("RAWG rejected the API key. Check it in src/config.ts.");
  if (!res.ok) throw new Error(`RAWG request failed (${res.status}).`);
  return res.json();
}

function platformNames(g: RawgGame): string | null {
  const names = (g.platforms ?? []).map((p) => p.platform.name);
  return names.length ? names.slice(0, 3).join(", ") : null;
}

function parseYear(date?: string | null): number | null {
  return date && date.length >= 4 ? Number(date.slice(0, 4)) : null;
}

interface RawgResponse {
  results?: RawgGame[];
}
interface RawgGame {
  id: number;
  name: string;
  released?: string | null;
  background_image?: string | null;
  platforms?: { platform: { name: string } }[];
  developers?: { name: string }[];
}
