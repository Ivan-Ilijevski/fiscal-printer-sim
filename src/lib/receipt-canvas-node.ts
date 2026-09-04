/**
 * Node adapter for the shared receipt renderer: Skia canvas, bwip-js's node build, and the
 * bundled fonts registered by hand.
 *
 * A browser gets its faces from `@font-face` and its logo from a URL. Neither exists here, so
 * this module owns the parts of the environment the preview gets for free — and owns them once
 * per process, because registering three fonts and decoding a 117KB PNG on every request would
 * dominate the render itself.
 */

import { GlobalFonts, createCanvas, loadImage, type Image } from '@napi-rs/canvas';
import bwipjs from 'bwip-js/node';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ReceiptData } from '@/types/receipt';
import { DecodeMessage } from '@/lib/datamatrix';
import {
  DatamatrixOptions,
  RECEIPT_WIDTH,
  RawSymbol,
  Receipt2DContext,
  ReceiptRenderDeps,
  calculateReceiptHeight,
  renderReceipt,
} from '@/lib/receipt-render';

/**
 * `public/` is the single home for these — the browser loads the same files over HTTP. Reaching
 * them with `fs` from a serverless function only works because next.config.ts traces them into
 * the bundle; see `outputFileTracingIncludes` there.
 */
const ASSET_DIR = path.join(process.cwd(), 'public');

/**
 * Latin letters and ASCII punctuation for faces that have none. Vendored from bwip-js (which
 * ships it for barcode captions) into public/ rather than read out of node_modules, so a
 * dependency bump can't move it; the OFL text sits beside it. It lives in public/ because that
 * is the one directory next.config.ts traces into the function — it being publicly fetchable is
 * harmless for an open font.
 */
const FALLBACK_MONO_FAMILY = 'ReceiptFallbackMono';

/**
 * Registered under an alias rather than their intrinsic names, so the family strings a receipt
 * carries (`PixelFont`, `PixelFontWide`) resolve identically here and in the browser. Skia reads
 * the weight from each file's OS/2 table, so both CompactFont faces share one alias and
 * `bold 22px "PixelFont"` still picks the bold one.
 */
const BUNDLED_FONTS: ReadonlyArray<{ file: string; family: string }> = [
  { file: 'CompactFont.woff2', family: 'PixelFont' },
  { file: 'CompactFont-bold.woff2', family: 'PixelFont' },
  { file: 'Pixelfont-Regular.woff2', family: 'PixelFontWide' },
  { file: 'Inconsolata.otf', family: FALLBACK_MONO_FAMILY },
];

/**
 * The stack every font string ends with.
 *
 * A browser resolves the generic `monospace` on its own, which is how the preview gets a `-`,
 * `x`, `:` or `,` — none of which exist in the pixel faces. Skia resolves a generic only when
 * nothing precedes it, so with a real family first it draws tofu instead of falling back. Naming
 * a registered family restores the per-glyph fallback; `monospace` stays last for a runtime that
 * does honour it.
 */
const FONT_FALLBACK = `"${FALLBACK_MONO_FAMILY}", monospace`;

/**
 * What an unavailable family resolves to.
 *
 * A container has no system fonts at all, so `Courier New` or `Impact` would otherwise render as
 * tofu or as nothing. Falling back to the one face we ship guarantees legible Cyrillic; the route
 * reports it in `X-Receipt-Font-Fallback` so a caller is never silently misled about what they
 * got. On a dev machine Skia does enumerate the system's families, so the same receipt can render
 * in the real Courier New locally and in PixelFont on the server — the header is what tells them
 * apart. To make a family render for real, register it here alongside the bundled ones.
 */
const FALLBACK_FAMILY = 'PixelFont';

interface ReceiptAssets {
  logo: Image;
}

let assetsPromise: Promise<ReceiptAssets> | null = null;

async function loadAssets(): Promise<ReceiptAssets> {
  for (const { file, family } of BUNDLED_FONTS) {
    GlobalFonts.register(await readFile(path.join(ASSET_DIR, file)), family);
  }

  // register() reports a font key rather than a boolean, so the registration is confirmed by
  // asking for the family back. Rendering an entire receipt in a silent fallback face is a much
  // worse failure than refusing to start.
  const missing = [...new Set(BUNDLED_FONTS.map((font) => font.family))].filter(
    (family) => !GlobalFonts.has(family)
  );
  if (missing.length > 0) {
    throw new Error(`Failed to register receipt fonts: ${missing.join(', ')}`);
  }

  return { logo: await loadImage(await readFile(path.join(ASSET_DIR, 'fiscalLogo.png'))) };
}

/** Memoized across requests — the work is identical every time and none of it is per-receipt. */
function receiptAssets(): Promise<ReceiptAssets> {
  assetsPromise ??= loadAssets().catch((error) => {
    // Don't cache a failure: a transient read error would otherwise poison the whole process.
    assetsPromise = null;
    throw error;
  });
  return assetsPromise;
}

/** An offscreen Skia surface for the datamatrix module grid. */
function createSurface(width: number, height: number) {
  const canvas = createCanvas(width, height);
  return { image: canvas, ctx: canvas.getContext('2d') as unknown as Receipt2DContext };
}

/** `raw()` returns either a linear or a module-grid symbol; only the latter is drawable here. */
function rawSymbol(options: DatamatrixOptions): RawSymbol | null {
  const [symbol] = bwipjs.raw(options);
  return symbol && 'pixs' in symbol ? symbol : null;
}

/**
 * Swaps any family this runtime can't produce for the bundled one, and reports which. Applied
 * before rendering because font metrics drive item-name wrapping — measuring in one face and
 * drawing in another would wrap against widths the receipt never uses.
 */
function resolveFontFamilies(data: ReceiptData): { data: ReceiptData; fontFallbacks: string[] } {
  const fontFallbacks: string[] = [];

  const resolve = (family: string): string => {
    if (GlobalFonts.has(family)) {
      return family;
    }
    if (!fontFallbacks.includes(family)) {
      fontFallbacks.push(family);
    }
    return FALLBACK_FAMILY;
  };

  return {
    data: {
      ...data,
      bodyFontFamily: resolve(data.bodyFontFamily),
      headerFontFamily: resolve(data.headerFontFamily),
    },
    fontFallbacks,
  };
}

export type ServerRenderResult =
  | { ok: true; png: Buffer; width: number; height: number; fontFallbacks: string[] }
  | { ok: false; failure: DecodeMessage };

/**
 * Renders a receipt to a PNG at the thermal printer's 384px width.
 *
 * A datamatrix that won't encode is returned as a failure rather than drawn as red text on the
 * image: an API answering 200 with the error baked into the pixels would be a worse lie than a
 * 400. The preview makes the opposite choice, which is why the renderer only reports it.
 */
export async function renderReceiptPng(receiptData: ReceiptData): Promise<ServerRenderResult> {
  const { logo } = await receiptAssets();
  const { data, fontFallbacks } = resolveFontFamilies(receiptData);

  const width = RECEIPT_WIDTH;
  // The height calculation is fractional; a canvas is whole pixels. Truncating here rather than
  // letting createCanvas do it silently keeps the reported height equal to the PNG's real one.
  const height = Math.trunc(calculateReceiptHeight(data));

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  const deps: ReceiptRenderDeps = { logo, createSurface, rawSymbol, fontFallback: FONT_FALLBACK };
  // The Skia context is wider than what the renderer declares it needs; see Receipt2DContext.
  const failure = renderReceipt(ctx as unknown as Receipt2DContext, data, width, deps);
  if (failure) {
    return { ok: false, failure };
  }

  return { ok: true, png: await canvas.encode('png'), width, height, fontFallbacks };
}
