/**
 * Compress an image File/Blob to a JPEG blob with max edge length.
 * Targets ≤ ~800KB output for typical photos.
 */
export const compressImage = async (
  file: Blob,
  maxEdge = 1600,
  quality = 0.7,
): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Compression failed'));
        else resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
};
