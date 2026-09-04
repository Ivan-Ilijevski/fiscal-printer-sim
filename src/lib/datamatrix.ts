/**
 * DataMatrix payload encoding.
 *
 * Two things matter for reproducing a scanned fiscal barcode exactly:
 *
 * 1. **Byte fidelity.** bwip-js UTF-8-expands every codepoint >= U+0080 unless `binarytext`
 *    is set, which doubles high bytes and encodes a longer, wrong payload.
 * 2. **Encodation choice.** ECC200 lets an encoder pick freely among ASCII/C40/Text/X12/
 *    EDIFACT/Base256 and how it pads. Macedonian fiscal devices use *pure Base256* for the
 *    whole payload; bwip-js picks a compact mixed encodation. Both are valid and carry the
 *    same bytes, but they lay out completely different modules — which is why a re-encoded
 *    receipt barcode never looked like the original.
 *
 * Codewords extracted from a real receipt (via the ISO 16022 Annex F inverse placement)
 * confirmed the device's stream is exactly what `base256Codewords` rebuilds here:
 * `231` latch, de-randomised length 136, the 136 payload bytes, then `129` + 253-state pads.
 */

export const QUIET_ZONE_MODULES = 1;

export type PayloadEncoding = 'text' | 'hex' | 'base64';
export type Encodation = 'auto' | 'base256';

/**
 * Square ECC200 sizes and their data-codeword capacity. The codeword count alone selects the
 * symbol size, so this doubles as the size table. Verified against bwip-js by feeding it
 * exactly `dataCodewords` raw codewords and checking the symbol it emits.
 */
export const ECC200_SQUARE_CAPACITY: ReadonlyArray<{ modules: number; dataCodewords: number }> = [
  { modules: 10, dataCodewords: 3 },
  { modules: 12, dataCodewords: 5 },
  { modules: 14, dataCodewords: 8 },
  { modules: 16, dataCodewords: 12 },
  { modules: 18, dataCodewords: 18 },
  { modules: 20, dataCodewords: 22 },
  { modules: 22, dataCodewords: 30 },
  { modules: 24, dataCodewords: 36 },
  { modules: 26, dataCodewords: 44 },
  { modules: 32, dataCodewords: 62 },
  { modules: 36, dataCodewords: 86 },
  { modules: 40, dataCodewords: 114 },
  { modules: 44, dataCodewords: 144 },
  { modules: 48, dataCodewords: 174 },
  { modules: 52, dataCodewords: 204 },
  { modules: 64, dataCodewords: 280 },
  { modules: 72, dataCodewords: 368 },
  { modules: 80, dataCodewords: 456 },
  { modules: 88, dataCodewords: 576 },
  { modules: 96, dataCodewords: 696 },
  { modules: 104, dataCodewords: 816 },
  { modules: 120, dataCodewords: 1050 },
  { modules: 132, dataCodewords: 1304 },
  { modules: 144, dataCodewords: 1558 },
];

/** An i18n key plus interpolation values, so this module holds no display strings. */
export interface DecodeMessage {
  key: string;
  values?: Record<string, string | number>;
}

export type BytesResult = { ok: true; bytes: Uint8Array } | { ok: false; error: DecodeMessage };

export function capacityFor(modules: number): number | null {
  return ECC200_SQUARE_CAPACITY.find((size) => size.modules === modules)?.dataCodewords ?? null;
}

export function smallestSizeFor(codewordCount: number): number | null {
  return ECC200_SQUARE_CAPACITY.find((size) => size.dataCodewords >= codewordCount)?.modules ?? null;
}

/** Codewords a Base256 payload of this length occupies: latch + length + the bytes. */
export function base256CodewordCount(payloadLength: number): number {
  return 1 + (payloadLength <= 249 ? 1 : 2) + payloadLength;
}

function decodeHex(value: string): BytesResult {
  // Scanner tooling commonly emits `:` or `-` separated hex, so tolerate those with whitespace.
  const cleaned = value.replace(/[\s:-]/g, '');
  if (cleaned.length === 0) {
    return { ok: false, error: { key: 'datamatrixErrorEmpty' } };
  }
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    return { ok: false, error: { key: 'datamatrixErrorHexChars' } };
  }
  if (cleaned.length % 2 !== 0) {
    return { ok: false, error: { key: 'datamatrixErrorHexOdd', values: { count: cleaned.length } } };
  }

  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return { ok: true, bytes };
}

function decodeBase64(value: string): BytesResult {
  const cleaned = value.replace(/\s/g, '');
  if (cleaned.length === 0) {
    return { ok: false, error: { key: 'datamatrixErrorEmpty' } };
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    return { ok: false, error: { key: 'datamatrixErrorBase64' } };
  }
  // Unpadded base64 is common; a length of 4n+1 can never be valid.
  const remainder = cleaned.length % 4;
  if (remainder === 1) {
    return { ok: false, error: { key: 'datamatrixErrorBase64' } };
  }
  const padded = remainder === 0 ? cleaned : cleaned + '='.repeat(4 - remainder);

  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    return { ok: false, error: { key: 'datamatrixErrorBase64' } };
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { ok: true, bytes };
}

export function decodeBytes(value: string, encoding: PayloadEncoding): BytesResult {
  switch (encoding) {
    case 'hex':
      return decodeHex(value);
    case 'base64':
      return decodeBase64(value);
    case 'text':
    default: {
      if (value.length === 0) {
        return { ok: false, error: { key: 'datamatrixErrorEmpty' } };
      }
      // Matches bwip-js's own `unescape(encodeURIComponent(text))`, so a receipt saved before
      // encodings existed renders byte-for-byte as it always did.
      return { ok: true, bytes: new TextEncoder().encode(value) };
    }
  }
}

/** ISO 16022 255-state randomisation. `position` is 1-based within the codeword stream. */
function randomize255(value: number, position: number): number {
  return (value + ((149 * position) % 255) + 1) % 256;
}

/**
 * Builds the codeword stream a fiscal device produces: pure Base256 for the whole payload,
 * padded out to `dataCodewords` so the symbol lands on the intended size.
 *
 * Reed-Solomon and module placement are left to bwip-js via its `raw` mode — only the
 * encodation differs between implementations, and that is what this reproduces.
 */
export function base256Codewords(payload: Uint8Array, dataCodewords: number): number[] {
  const codewords: number[] = [231]; // Base256 latch, itself never randomised

  if (payload.length <= 249) {
    codewords.push(randomize255(payload.length, 2));
  } else {
    codewords.push(randomize255(Math.floor(payload.length / 250) + 249, 2));
    codewords.push(randomize255(payload.length % 250, 3));
  }

  const firstDataPosition = codewords.length + 1;
  for (let i = 0; i < payload.length; i++) {
    codewords.push(randomize255(payload[i], firstDataPosition + i));
  }

  if (codewords.length < dataCodewords) {
    codewords.push(129); // the first pad is a plain 129
  }
  while (codewords.length < dataCodewords) {
    const position = codewords.length + 1;
    const value = 129 + ((149 * position) % 253) + 1;
    codewords.push(value > 254 ? value - 254 : value);
  }

  return codewords;
}

/** bwip-js's `raw` input format: a separator then three digits, per codeword. */
export function codewordsToRawText(codewords: number[]): string {
  return codewords.map((codeword) => `^${String(codeword).padStart(3, '0')}`).join('');
}

/** One JS char per byte (U+0000..U+00FF), the form bwip-js requires with `binarytext: true`. */
export function bytesToBinaryString(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

/**
 * How a symbol is scaled into the requested pixel box.
 *
 * `crisp` snaps to a whole number of pixels per module, so every module prints the same width.
 * The preview and the downloaded PNG are the same canvas, so this is the size the thermal head
 * actually receives. The cost is coarse control: a 56-module grid can only be 56, 112, 168,
 * 224 or 280px, and every slider position in between snaps down to one of those.
 *
 * `exact` uses the requested size verbatim. Modules then fall on fractional boundaries and
 * neighbours differ by a pixel, which is what makes the intermediate sizes reachable at all.
 */
export type ModuleScaling = 'exact' | 'crisp';

export function fitModuleScale(
  requestedSize: number,
  totalModules: number,
  scaling: ModuleScaling = 'crisp'
): { pxPerModule: number; size: number } {
  if (scaling === 'exact') {
    return { pxPerModule: requestedSize / totalModules, size: requestedSize };
  }
  const pxPerModule = Math.max(1, Math.floor(requestedSize / totalModules));
  return { pxPerModule, size: pxPerModule * totalModules };
}
