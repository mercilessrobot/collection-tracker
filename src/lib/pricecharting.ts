import { supabase } from "../supabase";
import type { Market } from "../types";

// Fetch a game's market value via the `price` Supabase Edge Function
// (which scrapes PriceCharting server-side). Prices come back in cents.
export async function fetchGameValue(title: string, platform: string | null): Promise<Market> {
  const { data, error } = await supabase.functions.invoke("price", {
    body: { title, platform: platform ?? "" },
  });
  if (error) {
    throw new Error("Value lookup isn't available yet — deploy the 'price' Edge Function (see README).");
  }
  const d = data as {
    found?: boolean;
    loose?: number | null;
    cib?: number | null;
    new?: number | null;
    url?: string | null;
    matchedTitle?: string | null;
    matchedConsole?: string | null;
  };
  if (!d?.found) throw new Error("No PriceCharting match found for that title/platform.");
  return {
    loose: d.loose ?? null,
    cib: d.cib ?? null,
    new: d.new ?? null,
    url: d.url ?? null,
    matchedTitle: d.matchedTitle ?? null,
    matchedConsole: d.matchedConsole ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export function formatMoney(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return (
    "$" +
    (cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Value for the copy you own: a manual override wins; otherwise the price for
// the given condition, falling back to loose→cib→new.
export function headlineValue(
  m: Market | null | undefined,
  condition?: string | null
): number | null {
  if (!m) return null;
  if (m.custom != null) return m.custom;
  if (condition === "loose") return m.loose ?? null;
  if (condition === "cib") return m.cib ?? null;
  if (condition === "new") return m.new ?? null;
  return m.loose ?? m.cib ?? m.new ?? null;
}

export function dollarsToCents(s: string): number | null {
  const n = parseFloat(s);
  return s.trim() !== "" && !Number.isNaN(n) ? Math.round(n * 100) : null;
}

export function centsToDollars(cents: number | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}
