// Supabase Edge Function: look up a game's market value from PriceCharting.
// If a product `url` is given, that exact product page is scraped (so you can
// pin an obscure/mismatched game to the correct listing). Otherwise it searches
// by title + platform and takes the first result. Runs server-side (CORS).
// Deploy separately — see the README. Personal, low-volume use.

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
    const reqUrl = new URL(req.url);
    let title = reqUrl.searchParams.get("title") ?? "";
    let platform = reqUrl.searchParams.get("platform") ?? "";
    let productUrl = reqUrl.searchParams.get("url") ?? "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      title = (body?.title ?? title).toString();
      platform = (body?.platform ?? platform ?? "").toString();
      productUrl = (body?.url ?? productUrl ?? "").toString();
    }

    // 1) Pinned product URL wins — scrape that page directly.
    if (/^https?:\/\/(www\.)?pricecharting\.com\/game\//i.test(productUrl.trim())) {
      const url = productUrl.trim();
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) return json({ found: false, error: `PriceCharting request failed (${res.status}).` });
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
      if (loose == null && cib == null && newp == null) return json({ found: false });
      const h1 = html.match(/<h1[^>]*>([^<]+)</i);
      const slug = url.match(/\/game\/([a-z0-9-]+)\//i);
      return json({
        found: true,
        loose,
        cib,
        new: newp,
        matchedTitle: h1 ? h1[1].trim() : null,
        matchedConsole: slug ? prettify(slug[1]) : null,
        url,
      });
    }

    // 2) Otherwise, search by title + platform.
    const q = [title, platform].filter(Boolean).join(" ").trim();
    if (!q) return json({ error: "Missing 'title' or 'url'." }, 400);

    const searchUrl = `https://www.pricecharting.com/search-products?q=${encodeURIComponent(q)}&type=prices`;
    const res = await fetch(searchUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) return json({ found: false, error: `PriceCharting request failed (${res.status}).` });

    const html = await res.text();
    const rowStart = html.indexOf('<tr id="product-');
    if (rowStart === -1) return json({ found: false });
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

function prettify(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
