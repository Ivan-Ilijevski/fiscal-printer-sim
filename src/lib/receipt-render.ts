/**
 * The receipt layout, once, for every runtime that can paint it.
 *
 * This module draws through a structural 2D context rather than `CanvasRenderingContext2D`, and
 * takes its browser-only pieces — the fiscal logo, an offscreen surface, the barcode encoder — as
 * injected dependencies. That is what lets the live preview and `POST /api/receipt/render` share
 * one definition of where every line lands instead of maintaining two that drift.
 *
 * Adapters: `ReceiptRenderer.tsx` (DOM canvas, `bwip-js/browser`) and
 * `receipt-canvas-node.ts` (`@napi-rs/canvas`, `bwip-js/node`).
 */

import { ReceiptData } from '@/types/receipt';
import { calculateDomesticSum, calculateDomesticVAT, calculateVAT } from '@/utils/VATCalc';
import {
  DecodeMessage,
  ModuleScaling,
  QUIET_ZONE_MODULES,
  base256CodewordCount,
  base256Codewords,
  bytesToBinaryString,
  capacityFor,
  codewordsToRawText,
  decodeBytes,
  fitModuleScale,
  smallestSizeFor,
} from '@/lib/datamatrix';

/** Thermal printer resolution. The backing store is never anything else. */
export const RECEIPT_WIDTH = 384;

/** Original fiscal logo dimensions, 2120x981. */
const LOGO_ASPECT_RATIO = 2120 / 981;

/**
 * A `drawImage` source. Deliberately opaque: the DOM and Skia hierarchies share no base type,
 * and this module only ever hands one straight back to `drawImage`.
 */
export type ReceiptImage = unknown;

/**
 * Exactly the 2D surface this module touches — nothing wider, so a new runtime only has to
 * supply these.
 *
 * Neither real context is structurally assignable to it (`fillStyle` is
 * `string | CanvasGradient | CanvasPattern` on both, and mutable properties are invariant), so
 * each adapter casts once at its boundary. That is the honest trade: one documented cast per
 * adapter, versus loosening this to `any` and losing the checking everywhere inside.
 */
export interface Receipt2DContext {
  font: string;
  fillStyle: string;
  textAlign: 'left' | 'right' | 'center';
  textBaseline: 'top' | 'bottom' | 'alphabetic';
  imageSmoothingEnabled: boolean;
  save(): void;
  restore(): void;
  scale(x: number, y: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  fillRect(x: number, y: number, w: number, h: number): void;
  createImageData(width: number, height: number): { data: Uint8ClampedArray };
  putImageData(image: { data: Uint8ClampedArray }, x: number, y: number): void;
  drawImage(image: ReceiptImage, ...args: number[]): void;
}

/**
 * bwip-js's bundled types enumerate the options common to every symbology; `raw` is a
 * per-symbology BWIPP option for datamatrix (the text is pre-encoded codewords rather than a
 * message) and isn't among them. Declaring the shape here keeps the call cast-free — passing a
 * typed variable rather than an object literal skips excess-property checking.
 */
export interface DatamatrixOptions {
  bcid: 'datamatrix';
  text: string;
  raw?: boolean;
  binarytext?: boolean;
}

/** The module-grid variant of a bwip-js `raw()` result. */
export interface RawSymbol {
  pixs: ArrayLike<number>;
  pixx: number;
  pixy: number;
}

/** An offscreen surface plus its context — the pair `drawModuleGrid` paints into and then blits. */
export interface OffscreenSurface {
  image: ReceiptImage;
  ctx: Receipt2DContext;
}

export interface ReceiptRenderDeps {
  /** Decoded fiscal logo. Null simply omits it, as it does while the browser preloads it. */
  logo: ReceiptImage | null;
  /** Offscreen surface for the datamatrix module grid. Null when no 2D context is available. */
  createSurface(width: number, height: number): OffscreenSurface | null;
  /** bwip-js `raw()`, already narrowed by the adapter to the module-grid variant. */
  rawSymbol(options: DatamatrixOptions): RawSymbol | null;
  /**
   * Families appended after the receipt's own, for characters it has no glyph for.
   *
   * Load-bearing, not cosmetic. The bundled pixel faces carry Cyrillic and digits but no Latin
   * letters and almost no ASCII punctuation — no `-`, `x`, `:`, `,`, `=` or `%` — so the
   * separators, the `2 x 3,50` quantity lines and the `ДДВ А=18,00%` rates all come from
   * whatever follows in this list. Browsers resolve the generic `monospace` themselves; Skia
   * only falls back to a *named registered* family, and silently draws tofu otherwise.
   */
  fontFallback: string;
  /**
   * Called at the y the symbol would have occupied, when encoding fails. Lets a caller that
   * still wants a usable image mark the spot in place — the failure is also returned, so a
   * caller that rejects the whole render instead simply omits this.
   */
  onDatamatrixFailure?(ctx: Receipt2DContext, message: DecodeMessage, y: number): void;
}

const FONT_METRIC_SAMPLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export interface FontMetrics {
  maxCharactersPerLine: number;
  avgCharWidth: number;
}

/**
 * Average advance width of the body face, which item-name wrapping is budgeted against.
 *
 * Measured on the live context rather than a throwaway canvas so it reflects the face the
 * receipt will actually be drawn in — a server context with a different fallback would otherwise
 * wrap against widths it never uses. `ctx.font` is restored, so this is safe to call mid-render.
 */
export function computeFontMetrics(
  ctx: Receipt2DContext,
  data: ReceiptData,
  fontFallback: string = 'monospace'
): FontMetrics {
  const previousFont = ctx.font;
  ctx.font = `${data.bodyFontSize}px "${data.bodyFontFamily}", ${fontFallback}`;
  const avgCharWidth = ctx.measureText(FONT_METRIC_SAMPLE).width / FONT_METRIC_SAMPLE.length;
  ctx.font = previousFont;

  return { maxCharactersPerLine: Math.floor(RECEIPT_WIDTH / avgCharWidth), avgCharWidth };
}

export function calculateReceiptHeight(data: ReceiptData): number {
  // Header: receipt type + number + store info (4 lines)
  const headerHeight = (data.headerFontSpacing * 2) + (data.bodyFontSpacing * 3) + 60;

  // Items
  const itemsHeight = data.items.length * data.bodyFontSpacing;

  // VAT sections and totals (approximately 15-20 lines)
  const vatSectionHeight = data.bodyFontSpacing * 20;

  // Datamatrix and logo
  const datamatrixHeight = data.datamatrixCode ? data.datamatrixSize + 10 : 0;
  const logoHeight = data.fiscalLogoSize ? (data.fiscalLogoSize / LOGO_ASPECT_RATIO) + 20 : 0;

  const padding = 100;

  return headerHeight + itemsHeight + vatSectionHeight + datamatrixHeight + logoHeight + padding;
}

/**
 * Paints the whole receipt onto `ctx`, which the caller has already sized to
 * `calculateReceiptHeight` and filled white.
 *
 * Returns a datamatrix decode/encode failure rather than drawing one, so each caller can react in
 * its own idiom: the preview paints the translated message onto the canvas, while the API answers
 * 400 instead of a 200 carrying an error baked into the image.
 */
export function renderReceipt(
  ctx: Receipt2DContext,
  data: ReceiptData,
  width: number,
  deps: ReceiptRenderDeps
): DecodeMessage | null {
  const padding = 0;

  const { maxCharactersPerLine } = computeFontMetrics(ctx, data, deps.fontFallback);

  /** Every font string on the receipt, so the fallback stack can't be forgotten at one site. */
  const bodyFont = (size = data.bodyFontSize, weight = '') =>
    `${weight}${size}px "${data.bodyFontFamily}", ${deps.fontFallback}`;
  const headerFont = () =>
    `${data.headerFontSize}px "${data.headerFontFamily}", ${deps.fontFallback}`;

  // Helper function to create separator lines dynamically based on actual text width
  const createSeparator = (pattern: string = '-') => {
    ctx.font = bodyFont();
    const patternWidth = ctx.measureText(pattern).width;
    const repeatCount = Math.ceil((width - 2 * padding) / patternWidth);
    return pattern.repeat(repeatCount);
  };

  let y = data.headerFontSize + 10; // Start with enough space for first line

  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';

  ctx.font = headerFont();

  // Apply double width if enabled
  if (data.headerFontDoubleWidth) {
    ctx.save();
    ctx.scale(2, 1);
    ctx.fillText(data.receiptType, width / 4, y);
    ctx.restore();
  } else {
    ctx.fillText(data.receiptType, width / 2, y);
  }
  y += data.headerFontSpacing;

  if (data.headerFontDoubleWidth) {
    ctx.save();
    ctx.scale(2, 1);
    ctx.fillText(`#${data.receiptNumber}`, width / 4, y);
    ctx.restore();
  } else {
    ctx.fillText(`#${data.receiptNumber}`, width / 2, y);
  }
  y += data.headerFontSpacing;

  ctx.font = bodyFont();
  ctx.fillText(data.storeName, width / 2, y);
  y += data.bodyFontSpacing;
  ctx.fillText(data.address, width / 2, y);
  y += data.bodyFontSpacing;
  ctx.fillText(`ДАН.БРОЈ: ${data.taxNumber}`, width / 2, y);
  y += data.bodyFontSpacing;
  ctx.fillText(`ДДВ БРОЈ: ${data.vatNumber}`, width / 2, y);
  y += data.bodyFontSpacing + 10;

  ctx.textAlign = 'left';

  data.items.forEach(item => {
    const itemLine = `${item.quantity} x ${item.price.toFixed(2).replace('.', ',')}  `;
    const totalPrice = item.price * item.quantity;
    const priceText = `${totalPrice.toFixed(2).replace('.', ',')} ${item.vatType==='A'?'А':item.vatType==='B'?'Б':item.vatType==='V'?'В':'Г'}`;
    // си имаат две линии за текст ако има повеќе артикли

    ctx.textAlign = 'right';
    ctx.fillText(itemLine, width - padding, y);
    y+= data.bodyFontSpacing;
    ctx.textAlign = 'left';

    const lines = wrapTextKing(item.name, maxCharactersPerLine - itemLine.length);
    if (countLines(lines) > 1) {
      y -= data.bodyFontSpacing; // move back up to overwrite the first line
    }

    for(const line of lines.split('\n')) {
      ctx.fillText(line, padding, y);
      y += data.bodyFontSpacing;
    }
    y-= data.bodyFontSpacing;

    ctx.textAlign = 'right';
    ctx.fillText(priceText, width - padding, y);
    ctx.textAlign = 'left';
    y += data.bodyFontSpacing;
  });

  /* Промет од македонски производи */
  ctx.fillText(createSeparator('- '), padding, y);
  y += data.bodyFontSpacing;

  const dVatA = calculateDomesticVAT(data, 'A');
  const dVatB = calculateDomesticVAT(data, 'B');
  const dVatV = calculateDomesticVAT(data, 'V');
  const dVatG = calculateDomesticVAT(data, 'G');

  ctx.font = bodyFont();
  ctx.fillText(`ПРОМЕТ ОД МАКЕДОНСКИ ПР.`,padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(calculateDomesticSum(data), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ А=${data.vatTypeA.toFixed(2).replace('.', ',')}%`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(dVatA.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ Б=${data.vatTypeB.toFixed(2).replace('.', ',')}%`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(dVatB.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ В=${data.vatTypeV.toFixed(2).replace('.', ',')}%`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(dVatV.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ Г=${data.vatTypeG.toFixed(2).replace('.', ',')}%`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(dVatG.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText((dVatA + dVatB + dVatV + dVatG).toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(createSeparator('- '), padding, y);
  y += data.bodyFontSpacing;

  const vatA = calculateVAT(data, 'A');
  const vatB = calculateVAT(data, 'B');
  const vatV = calculateVAT(data, 'V');
  const vatG = calculateVAT(data, 'G');

  ctx.font = bodyFont(data.bodyFontSize, 'bold ');
  ctx.fillText(`ВКУПЕН ПРОМЕТ`,padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.total.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.font = bodyFont();

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText((vatA + vatB + vatV + vatG).toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ А=${data.vatTypeA.toFixed(2).replace('.', ',')}%`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(vatA.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ Б=${data.vatTypeB.toFixed(2).replace('.', ',')}%`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(vatB.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ В=${data.vatTypeV.toFixed(2).replace('.', ',')}%`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(vatV.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(`ВКУПНО ДДВ Г=${data.vatTypeG.toFixed(2).replace('.', ',')}%`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(vatG.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.textAlign = 'left';
  ctx.fillText(createSeparator('-'), padding, y);
  y += data.bodyFontSpacing;

  ctx.fillText('ВИ БЛАГОДАРИМЕ!', padding, y);
  y += data.bodyFontSpacing ;
  ctx.fillText(`${data.paymentMethod}`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.total.toFixed(2).replace('.', ','), width - padding, y);
  ctx.textAlign = 'left';

 // y += data.bodyFontSpacing/2;
  // Cannot make the margins smaller since there is padding in the datamatrix

  const datamatrixFailure = data.datamatrixCode ? renderDatamatrix(ctx, data, width, y, deps) : null;

  y += data.datamatrixSize + data.bodyFontSpacing / 1.5;

  ctx.fillText(`0035120`, padding, y);
  ctx.textAlign = 'center';
  ctx.fillText(`${data.dateTextFlag ? 'ДАТУМ ' : ''}${data.date}`, width / 2, y);
  ctx.textAlign = 'right';

  ctx.fillText(`${data.time}`, width - padding, y);
  y += data.bodyFontSpacing/2;

  if (deps.logo) {
    ctx.drawImage(deps.logo, padding, y, data.fiscalLogoSize, data.fiscalLogoSize / LOGO_ASPECT_RATIO);
  }

  y += (data.fiscalLogoSize / LOGO_ASPECT_RATIO)/2 ;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = bodyFont(data.bodyFontSize + 2, 'bold ');
  ctx.fillText('АС456784334', width - padding - 20, y - data.bodyFontSpacing/4);
  ctx.textBaseline = 'top';
  ctx.fillText('АС564323389', width - padding - 20, y + data.bodyFontSpacing/4);

  y += (data.fiscalLogoSize / LOGO_ASPECT_RATIO)/2 + data.headerFontSpacing;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = headerFont();

  // Apply double width if enabled
  if (data.headerFontDoubleWidth) {
    ctx.save();
    ctx.scale(2, 1);
    ctx.fillText(data.receiptType, width / 4, y);
    ctx.restore();
  } else {
    ctx.fillText(data.receiptType, width / 2, y);
  }

  y += data.bodyFontSpacing * 2;
  ctx.textAlign = 'left';
  ctx.font = bodyFont();
  ctx.fillText(createSeparator('-'), padding, y);

  return datamatrixFailure;
}

// Dynamic Width (Build Regex)
function wrapTextKing(s: string, w: number): string {
  return s.replace(
    new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1\n'
  );
}

function countLines(text: string): number {
  return text.split(/\r?\n/).length;
}

/**
 * Paints a module grid: white quiet zone, one surface pixel per module, then an upscale.
 *
 * `imageSmoothingEnabled = false` is load-bearing rather than cosmetic — bilinear-resampling a
 * module grid blends neighbouring modules into greys no scanner can threshold. It is save/restored
 * because the fiscal logo drawn immediately after does want smoothing. This matters more under
 * `exact` scaling, where the upscale factor is fractional and smoothing would have something to
 * interpolate on every module edge rather than only at the outer ones.
 */
function drawModuleGrid(
  ctx: Receipt2DContext,
  getBit: (row: number, col: number) => 0 | 1,
  modulesWide: number,
  modulesHigh: number,
  canvasWidth: number,
  y: number,
  requestedSize: number,
  scaling: ModuleScaling,
  deps: ReceiptRenderDeps
) {
  const gridWidth = modulesWide + QUIET_ZONE_MODULES * 2;
  const gridHeight = modulesHigh + QUIET_ZONE_MODULES * 2;

  const surface = deps.createSurface(gridWidth, gridHeight);
  if (!surface) return;

  const image = surface.ctx.createImageData(gridWidth, gridHeight);
  image.data.fill(255); // opaque white, quiet zone included
  for (let row = 0; row < modulesHigh; row++) {
    for (let col = 0; col < modulesWide; col++) {
      if (!getBit(row, col)) continue;
      const offset = ((row + QUIET_ZONE_MODULES) * gridWidth + col + QUIET_ZONE_MODULES) * 4;
      image.data[offset] = 0;
      image.data[offset + 1] = 0;
      image.data[offset + 2] = 0;
    }
  }
  surface.ctx.putImageData(image, 0, 0);

  // Driven by the longer axis so a rectangular symbol still fits inside the requested box, and
  // never rounded up, so the drawing can't exceed the height reserved for it. Under `crisp` the
  // factor is a whole number of pixels per module; under `exact` it is whatever the requested
  // size demands. Destination is rounded either way — a fractional rect antialiases its own
  // right and bottom edges into grey even with smoothing off.
  const { pxPerModule } = fitModuleScale(requestedSize, Math.max(gridWidth, gridHeight), scaling);
  const drawWidth = Math.round(pxPerModule * gridWidth);
  const drawHeight = Math.round(pxPerModule * gridHeight);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(surface.image, Math.round((canvasWidth - drawWidth) / 2), y, drawWidth, drawHeight);
  ctx.restore();
}

/**
 * Encodes the payload into a symbol.
 *
 * `auto` lets bwip-js choose a compact mixed encodation. `base256` rebuilds the codeword
 * stream a fiscal device emits — pure Base256 padded to the chosen size — and hands it to
 * bwip-js's `raw` mode, which still does Reed-Solomon and module placement. Verified to
 * reproduce a real receipt's 48x48 symbol with zero of 2304 modules differing.
 */
function drawGeneratedSymbol(
  ctx: Receipt2DContext,
  data: ReceiptData,
  canvasWidth: number,
  y: number,
  deps: ReceiptRenderDeps
): DecodeMessage | null {
  const decoded = decodeBytes(data.datamatrixCode, data.datamatrixCodeEncoding);
  if (!decoded.ok) {
    return decoded.error;
  }

  let options: DatamatrixOptions;

  if (data.datamatrixEncodation === 'base256') {
    const needed = base256CodewordCount(decoded.bytes.length);
    // An explicit size is the point of this mode: 48x48 is what the devices use, and it is
    // deliberately larger than the smallest symbol the payload would fit in.
    const modules = data.datamatrixSymbolSize || smallestSizeFor(needed);
    const capacity = modules ? capacityFor(modules) : null;
    if (!modules || !capacity) {
      return { key: 'datamatrixErrorNoSize', values: { bytes: decoded.bytes.length } };
    }
    if (needed > capacity) {
      return {
        key: 'datamatrixErrorTooLarge',
        values: { bytes: decoded.bytes.length, max: capacity - (decoded.bytes.length <= 249 ? 2 : 3), modules },
      };
    }
    options = {
      bcid: 'datamatrix',
      raw: true,
      text: codewordsToRawText(base256Codewords(decoded.bytes, capacity)),
    };
  } else {
    options = {
      bcid: 'datamatrix',
      // Without `binarytext` bwip-js UTF-8-expands every codepoint >= U+0080, silently doubling
      // each high byte and encoding a longer, wrong payload into a larger symbol.
      binarytext: true,
      text: bytesToBinaryString(decoded.bytes),
    };
  }

  const symbol = deps.rawSymbol(options);
  if (!symbol) {
    return { key: 'datamatrixErrorEncode' };
  }

  drawModuleGrid(
    ctx,
    (row, col) => (symbol.pixs[row * symbol.pixx + col] ? 1 : 0),
    symbol.pixx,
    symbol.pixy,
    canvasWidth,
    y,
    data.datamatrixSize,
    data.datamatrixScaling,
    deps
  );
  return null;
}

function renderDatamatrix(
  ctx: Receipt2DContext,
  data: ReceiptData,
  canvasWidth: number,
  y: number,
  deps: ReceiptRenderDeps
): DecodeMessage | null {
  let failure: DecodeMessage | null;
  try {
    failure = drawGeneratedSymbol(ctx, data, canvasWidth, y, deps);
  } catch (error) {
    // bwip-js throws for payloads no symbol size can hold.
    console.error('Error generating datamatrix:', error);
    failure = { key: 'datamatrixErrorEncode' };
  }

  if (failure) {
    deps.onDatamatrixFailure?.(ctx, failure, y);
  }
  return failure;
}
