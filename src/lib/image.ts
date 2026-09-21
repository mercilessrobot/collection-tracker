// Decode a captured/selected photo to an upright, EXIF-free JPEG *before* it
// goes into the crop editor. This is the key to reliable cropping: iPhone
// photos carry EXIF rotation, and letting the cropper deal with that leads to
// a mismatch between the visible crop box and the exported pixels (the crop
// appears to be ignored). Here we bake in the rotation and drop the EXIF, so
// the cropper works on a plain upright image and the crop is exact.
export async function normalizeImage(file: File, maxDim = 1600): Promise<Blob> {
  const bitmap = await loadUprightBitmap(file);
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
      0.9
    )
  );
}

async function loadUprightBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}
