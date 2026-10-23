import 'server-only';
import { randomUUID } from 'node:crypto';
import { ApiError } from './http';

// Uploaded photos go to Vercel Blob when BLOB_READ_WRITE_TOKEN is set (the stored value is the public URL).
// Without a token they are written to public/media for local development only; Vercel's disk is read-only.
// Vercel limits a request body to about 4.5 MB, so uploads are capped just below that.

export const MAX_BYTES = 4 * 1024 * 1024;

function detectExtension(b: Uint8Array): { ext: string; type: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return { ext: 'png', type: 'image/png' };
  }
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return { ext: 'webp', type: 'image/webp' };
  }
  return null;
}

/** Validates the image (type is taken from its own bytes, never the client's name; never SVG) and stores it under a random name. */
export async function storeImage(file: unknown, kind: 'cities' | 'vehicles'): Promise<string> {
  if (!(file instanceof File) || file.size === 0) throw new ApiError(400, 'Choose an image file');
  if (file.size > MAX_BYTES) throw new ApiError(413, 'Image must be 4 MB or smaller');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectExtension(bytes);
  if (!detected) throw new ApiError(400, 'Only JPEG, PNG or WebP images are allowed');
  const name = `${randomUUID().replace(/-/g, '')}.${detected.ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`${kind}/${name}`, Buffer.from(bytes), { access: 'public', contentType: detected.type, addRandomSuffix: false });
    return blob.url;
  }
  if (process.env.VERCEL) throw new ApiError(503, 'Photo storage is not set up. Add a Blob store to the Vercel project.');
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const dir = join(process.cwd(), 'public', 'media', kind);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);
  return name;
}

/** Removes a stored photo. Bundled files (plain names) are left in place; only Blob URLs are deleted. */
export async function deleteImage(nameOrUrl: string | null | undefined): Promise<void> {
  if (!nameOrUrl || !/^https:\/\//.test(nameOrUrl) || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { del } = await import('@vercel/blob');
    await del(nameOrUrl);
  } catch {
    // an orphaned file is harmless; the database row is the source of truth
  }
}
