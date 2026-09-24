// Supabase Edge Function: look up a game's market value from PriceCharting's
// public search page. Runs server-side because their site doesn't allow browser
// (CORS) calls. Intended for personal, low-volume use (one request when you add
// or edit a game). Deploy separately — see the README.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let title = url.searchParams.get("title") ?? "";
    let platform = url.searchParams.get("platform") ?? "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      title = (body?.title ?? title).toString();
      platform = (body?.platform ?? platform ?? "").toString();
    }

    const q = [title, platform].filter(Boolean).join(" ").trim();
    if (!q) return json({ error: "Missing 'title'." }, 400);

    const searchUrl = `https://www.pricecharting.com/search-products?q=${encodeURIComponent(q)}&type=prices`;
    const res = await fetch(searchUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) return json({ found: false, error: `PriceCharting request failed (${res.status}).` });

    const html = await res.text();
    const rowStart = html.indexOf('<tr id="product-');
    if (rowStart === -1) return json({ found: false });
    const rowEnd = html.indexOf("</tr>", rowStart);
    const row = html.slice(rowStart, rowEnd);

    const price = (cls: string): number | null => {
      const m = row.match(
        new RegExp(cls + '"[^>]*>\\s*<span class="js-price">\\$?([0-9,]+\\.[0-9]{2})', "i")
      );
      return m ? Math.round(parseFloat(m[1].replace(/,/g, "")) * 100) : null;
    };
    const titleM = row.match(/<td class="title">\s*<a[^>]*>([^<]+)<\/a>/i);
    const consoleM = row.match(/\/console\/[a-z0-9-]+"?>\s*([^<]+?)\s*</i);
    const linkM = row.match(/href="(https:\/\/www\.pricecharting\.com\/game\/[^"]+)"/i);

    return json({
      found: true,
      loose: price("used_price"),
      cib: price("cib_price"),
      new: price("new_price"),
      matchedTitle: titleM ? titleM[1].trim() : null,
      matchedConsole: consoleM ? consoleM[1].trim() : null,
      url: linkM ? linkM[1] : null,
    });
  } catch (e) {
    return json({ found: false, error: String(e) });
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
