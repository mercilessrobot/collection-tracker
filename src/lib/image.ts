// Resize + re-encode a captured/selected photo to a small JPEG before upload.
// Also converts iPhone HEIC to JPEG (Safari can decode HEIC) and applies the
// photo's EXIF rotation so it isn't sideways.
export async function processImageFile(
  file: File,
  maxDim = 900,
  quality = 0.82
): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ("close" in bitmap) bitmap.close();

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not process the image."))),
      "image/jpeg",
      quality
    )
  );
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}
