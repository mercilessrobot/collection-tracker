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
    creator: null,
    year: parseYear(g.released),
    cover_url: g.background_image ?? null,
    sourceId: String(g.id),
    // Platforms are in the search result; the publisher needs the detail call.
    platform: platformNames(g),
    publisher: null,
  }));
}

// Second call once the user picks a result: fetch publisher + platform.
export async function resolveGame(result: LookupResult): Promise<LookupResult> {
  try {
    const json = (await request(`${BASE}/games/${result.sourceId}?key=${RAWG_API_KEY}`)) as RawgGame;
    const publishers = (json.publishers ?? []).map((p) => p.name);
    const developers = (json.developers ?? []).map((d) => d.name);
    const platforms = (json.platforms ?? []).map((p) => p.platform.name);
    return {
      ...result,
      publisher: publishers.length
        ? publishers.slice(0, 2).join(", ")
        : developers.length
          ? developers.slice(0, 2).join(", ")
          : (result.publisher ?? null),
      platform: platforms.length ? platforms.slice(0, 4).join(", ") : (result.platform ?? null),
    };
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
  publishers?: { name: string }[];
}
