// Supabase Edge Function: refresh every game's PriceCharting value in bulk.
// Meant to be invoked on a schedule (Supabase Cron) — e.g. weekly. Uses the
// service-role key (auto-injected) to read/update all of your games, skipping
// any with a manual custom value. Honors a per-game pinned product URL. Protected
// by a shared secret (REFRESH_SECRET env, sent as the x-refresh-secret header).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const TIME_BUDGET_MS = 120_000;
const DELAY_MS = 250;

Deno.serve(async (req) => {
  const secret = Deno.env.get("REFRESH_SECRET") ?? "";
  if (!secret || req.headers.get("x-refresh-secret") !== secret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  const { data: games, error } = await supabase
    .from("items")
    .select("id, title, platform, market")
    .eq("type", "game");
  if (error) return json({ error: error.message }, 500);

  const start = Date.now();
  let updated = 0;
  let skipped = 0;
  let missed = 0;
  let remaining = 0;

  for (const g of games ?? []) {
    const mkt = g.market as { custom?: number | null; pinnedUrl?: string | null } | null;
    if (mkt?.custom != null) {
      skipped++; // manual value — never overwrite
      continue;
    }
    if (Date.now() - start > TIME_BUDGET_MS) {
      remaining++;
      continue;
    }
    const pinnedUrl = mkt?.pinnedUrl ?? null;
    const m = await scrape(g.title as string, g.platform as string | null, pinnedUrl);
    if (m) {
      await supabase.from("items").update({ market: { ...m, pinnedUrl } }).eq("id", g.id);
      updated++;
    } else {
      missed++;
    }
    await sleep(DELAY_MS);
  }

  return json({ total: games?.length ?? 0, updated, skipped, missed, remaining });
});

async function scrape(title: string, platform: string | null, pinnedUrl: string | null) {
  // Pinned product URL → scrape that page directly.
  if (pinnedUrl && /^https?:\/\/(www\.)?pricecharting\.com\/game\//i.test(pinnedUrl)) {
    const res = await fetch(pinnedUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const html = await res.text();
    const price = (id: string): number | null => {
      const m = html.match(
        new RegExp('id="' + id + '"[^>]*>\\s*<span[^>]*>\\s*\\$?([0-9,]+\\.[0-9]{2})', "i")
      );
      return m ? Math.round(parseFloat(m[1].replace(/,/g, "")) * 100) : null;
    };
    const loose = price("used_price");
    const cib = price("complete_price");
    const newp = price("new_price");
    if (loose == null && cib == null && newp == null) return null;
    const h1 = html.match(/<h1[^>]*>([^<]+)</i);
    const slug = pinnedUrl.match(/\/game\/([a-z0-9-]+)\//i);
    return {
      loose,
      cib,
      new: newp,
      matchedTitle: h1 ? h1[1].trim() : null,
      matchedConsole: slug ? prettify(slug[1]) : null,
      url: pinnedUrl,
      updatedAt: new Date().toISOString(),
    };
  }

  // Otherwise, search.
  const q = [title, platform].filter(Boolean).join(" ").trim();
  if (!q) return null;
  const res = await fetch(
    `https://www.pricecharting.com/search-products?q=${encodeURIComponent(q)}&type=prices`,
    { headers: { "User-Agent": UA } }
  );
  if (!res.ok) return null;
  const html = await res.text();
  const rowStart = html.indexOf('<tr id="product-');
  if (rowStart === -1) return null;
  const row = html.slice(rowStart, html.indexOf("</tr>", rowStart));
  const price = (cls: string): number | null => {
    const m = row.match(
      new RegExp(cls + '"[^>]*>\\s*<span class="js-price">\\$?([0-9,]+\\.[0-9]{2})', "i")
    );
    return m ? Math.round(parseFloat(m[1].replace(/,/g, "")) * 100) : null;
  };
  const titleM = row.match(/<td class="title">\s*<a[^>]*>([^<]+)<\/a>/i);
  const consoleM = row.match(/\/console\/[a-z0-9-]+"?>\s*([^<]+?)\s*</i);
  const linkM = row.match(/href="(https:\/\/www\.pricecharting\.com\/game\/[^"]+)"/i);
  const loose = price("used_price");
  const cib = price("cib_price");
  const newp = price("new_price");
  if (loose == null && cib == null && newp == null) return null;
  return {
    loose,
    cib,
    new: newp,
    matchedTitle: titleM ? titleM[1].trim() : null,
    matchedConsole: consoleM ? consoleM[1].trim() : null,
    url: linkM ? linkM[1] : null,
    updatedAt: new Date().toISOString(),
  };
}

function prettify(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
