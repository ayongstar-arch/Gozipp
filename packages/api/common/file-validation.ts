import { randomUUID } from 'crypto';

/**
 * Upload validation — magic-byte sniffing (never trust extension or mimetype).
 * Stored XSS via .svg/.html dies here: only raster images + PDF pass.
 */
export type SafeFileKind = 'jpg' | 'png' | 'gif' | 'webp' | 'pdf';

const SIGNATURES: Array<{ kind: SafeFileKind; mime: string; ext: string; match: (b: Buffer) => boolean }> = [
  { kind: 'jpg', mime: 'image/jpeg', ext: 'jpg', match: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { kind: 'png', mime: 'image/png', ext: 'png', match: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { kind: 'gif', mime: 'image/gif', ext: 'gif', match: (b) => b.length > 6 && b.toString('ascii', 0, 6).match(/^GIF8[79]a/) !== null },
  { kind: 'webp', mime: 'image/webp', ext: 'webp', match: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { kind: 'pdf', mime: 'application/pdf', ext: 'pdf', match: (b) => b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-' },
];

export function sniffFile(buffer: Buffer, allowed: SafeFileKind[]): { kind: SafeFileKind; mime: string; ext: string } | null {
  if (!buffer || buffer.length === 0) return null;
  for (const sig of SIGNATURES) {
    if (!allowed.includes(sig.kind)) continue;
    try {
      if (sig.match(buffer)) return { kind: sig.kind, mime: sig.mime, ext: sig.ext };
    } catch {
      // keep scanning
    }
  }
  return null;
}

/** Storage name is always server-generated — client filename never touches disk. */
export function safeStorageName(ext: string): string {
  return `${randomUUID()}.${ext}`;
}
