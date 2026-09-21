import { supabase } from "../supabase";

// Turn a scanned retail barcode (UPC/EAN) into a searchable product title,
// via the `barcode` Supabase Edge Function (which proxies a UPC database —
// browsers can't call those directly). Returns null if nothing was found.
export async function upcToTitle(upc: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("barcode", {
    body: { upc },
  });
  if (error) {
    throw new Error(
      "Barcode lookup isn't available yet — the Supabase 'barcode' function may not be deployed (see README)."
    );
  }
  const title = (data as { title?: string | null })?.title ?? null;
  return title ? cleanProductTitle(title) : null;
}

// Retail titles are noisy ("BLADE RUNNER 2049 [4K UHD/BLU-RAY]"). Strip common
// format / edition / platform words so the TMDB/RAWG search matches better.
export function cleanProductTitle(raw: string): string {
  let t = raw.replace(/\[[^\]]*\]|\([^)]*\)/g, " ");
  t = t.replace(
    /\b(4k|uhd|ultra hd|blu[- ]?ray|bluray|bd|dvd|digital|hd|widescreen|fullscreen|full screen|steelbook|collector'?s? edition|special edition|limited edition|deluxe edition|unrated|remastered|import|brand new|sealed|nintendo switch|switch|playstation ?[0-9]?|ps[0-9]|xbox(?: one| series [sx])?|pc|multi[- ]?platform)\b/gi,
    " "
  );
  t = t
    .replace(/[-_/|:]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return t || raw;
}
