// Supabase Edge Function: turn a scanned UPC/EAN barcode into a product title.
//
// It proxies UPCitemdb because browsers can't call that API directly (CORS).
// Deploy it separately — see the README. No secret is required (it uses the
// free trial tier, ~100 lookups/day). To raise that limit, set a UPCITEMDB_KEY
// secret and it will use the paid endpoint instead.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let upc = url.searchParams.get("upc") ?? "";
    if (!upc && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      upc = (body?.upc ?? "").toString();
    }
    upc = upc.replace(/[^0-9]/g, "");
    if (!upc) return json({ error: "Missing 'upc'." }, 400);

    const key = Deno.env.get("UPCITEMDB_KEY");
    const endpoint = key
      ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${upc}`
      : `https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`;
    const headers: Record<string, string> = key
      ? { user_key: key, key_type: "3scale" }
      : {};

    const res = await fetch(endpoint, { headers });
    if (!res.ok) {
      return json({ title: null, upc, error: `UPC lookup failed (${res.status}).` });
    }

    const data = await res.json();
    const item = Array.isArray(data.items) ? data.items[0] : null;
    return json({ title: item?.title ?? null, brand: item?.brand ?? null, upc });
  } catch (e) {
    return json({ title: null, error: String(e) });
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
