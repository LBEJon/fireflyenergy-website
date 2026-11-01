/** Same contract as the CRM helper: keep aspect ratio, never upscale, integer sizes. */
export function targetSize(w: number, h: number, max = 2000): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= max) return { w: Math.round(w), h: Math.round(h) };
  const k = max / long;
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

/** Downscale an image to <= 2000 px long edge as JPEG q0.85. PDFs (and anything that is not an
 *  image, or that fails to decode) are returned untouched. Browser-only. */
export async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bmp = await createImageBitmap(file);
    const { w, h } = targetSize(bmp.width, bmp.height, MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff'; // flatten transparency (PNG/WebP) before JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', JPEG_QUALITY));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
