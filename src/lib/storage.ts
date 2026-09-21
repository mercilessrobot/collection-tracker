import { supabase } from "../supabase";

// Upload a processed cover image to the public `covers` bucket and return its
// public URL (which we store in the item's cover_url).
export async function uploadCover(blob: Blob): Promise<string> {
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("covers").upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    throw new Error(
      /bucket/i.test(error.message)
        ? "Photo storage isn't set up yet — run supabase/storage.sql once (see README)."
        : error.message
    );
  }
  const { data } = supabase.storage.from("covers").getPublicUrl(path);
  return data.publicUrl;
}
