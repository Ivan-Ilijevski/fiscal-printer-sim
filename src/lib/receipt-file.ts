import { ReceiptData } from '@/types/receipt';
import { defaultReceiptData } from '@/lib/receipt-presets';
import { clampNumeric, isFiniteNumber, isReceiptItem, numericFieldBounds } from '@/lib/receipt-schema';
import { sumItems } from '@/utils/VATCalc';

const FILE_KIND = 'fiscal-receipt';
const FILE_VERSION = 1;

interface ReceiptFileEnvelope {
  kind: typeof FILE_KIND;
  version: typeof FILE_VERSION;
  exportedAt: string;
  data: ReceiptData;
}

/** Triggers a browser download of the current receipt as a `.json` file. Mirrors the
 *  `<a download>` idiom ReceiptRenderer.tsx already uses for the PNG export. */
export function downloadReceiptJson(data: ReceiptData): void {
  const envelope: ReceiptFileEnvelope = {
    kind: FILE_KIND,
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = `receipt-${data.receiptNumber}.json`;
  link.href = url;
  // Unlike the PNG export's data: URL, a blob: URL is a live handle: a detached anchor is not
  // clickable in every browser, and revoking in the same tick can cancel the download before
  // it starts. So the link goes into the document, and the handle is released a tick later.
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type ParseReceiptFileResult =
  | { status: 'ok'; data: ReceiptData; filledFields: string[] }
  | { status: 'invalid-json' }
  | { status: 'invalid-shape' };

/**
 * Unwraps either the envelope shape ({kind, data}) or a bare ReceiptData-ish object, so a
 * hand-written file or a preset's `data` blob (copy-pasted without its envelope) both import.
 */
function extractCandidate(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.data === 'object' && record.data !== null) {
    return record.data as Record<string, unknown>;
  }

  return record;
}

/**
 * An empty object or an unrelated JSON blob isn't "a partial/older receipt export" - it
 * shares no field names with ReceiptData at all - so it's rejected up front instead of
 * silently importing a receipt made entirely of defaults.
 */
function looksLikeReceipt(candidate: Record<string, unknown>): boolean {
  return Object.keys(defaultReceiptData).some((field) => field in candidate);
}

/**
 * Parses an exported receipt file leniently: every field is taken only when it passes its
 * type guard, everything else falls back to `defaultReceiptData` rather than rejecting the
 * whole file. This is what lets an older or hand-edited export still import cleanly.
 */
export function parseReceiptFile(text: string): ParseReceiptFileResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: 'invalid-json' };
  }

  const candidate = extractCandidate(parsed);
  if (!candidate || !looksLikeReceipt(candidate)) {
    return { status: 'invalid-shape' };
  }

  const filledFields: string[] = [];
  const take = <K extends keyof ReceiptData>(field: K, guard: (value: unknown) => boolean): ReceiptData[K] => {
    const value = candidate[field];
    if (guard(value)) {
      return value as ReceiptData[K];
    }
    filledFields.push(field);
    return defaultReceiptData[field];
  };

  const isString = (value: unknown): value is string => typeof value === 'string';
  const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

  const data: ReceiptData = {
    receiptType: take('receiptType', isString),
    storeName: take('storeName', isString),
    address: take('address', isString),
    taxNumber: take('taxNumber', isString),
    vatNumber: take('vatNumber', isString),
    items: [],
    vatTypeA: take('vatTypeA', isFiniteNumber),
    vatTypeB: take('vatTypeB', isFiniteNumber),
    vatTypeV: take('vatTypeV', isFiniteNumber),
    vatTypeG: take('vatTypeG', isFiniteNumber),
    total: 0,
    paymentMethod: take('paymentMethod', isString),
    receiptNumber: take('receiptNumber', isString),
    date: take('date', isString),
    dateTextFlag: take('dateTextFlag', isBoolean),
    time: take('time', isString),
    datamatrixCode: take('datamatrixCode', isString),
    datamatrixSize: take('datamatrixSize', isFiniteNumber),
    fiscalLogoSize: take('fiscalLogoSize', isFiniteNumber),
    bodyFontSize: take('bodyFontSize', isFiniteNumber),
    headerFontSize: take('headerFontSize', isFiniteNumber),
    headerFontSpacing: take('headerFontSpacing', isFiniteNumber),
    bodyFontSpacing: take('bodyFontSpacing', isFiniteNumber),
    bodyFontFamily: take('bodyFontFamily', isString),
    headerFontFamily: take('headerFontFamily', isString),
    headerFontDoubleWidth: take('headerFontDoubleWidth', isBoolean),
  };

  // Clamp the same fields the form clamps, the same way — an out-of-range value from a file
  // is no different from one typed into the number input.
  const boundedFields = [
    'datamatrixSize',
    'fiscalLogoSize',
    'bodyFontSize',
    'headerFontSize',
    'headerFontSpacing',
    'bodyFontSpacing',
  ] as const;
  for (const field of boundedFields) {
    const bounds = numericFieldBounds[field];
    data[field] = clampNumeric(data[field], { ...bounds, fallback: bounds.min });
  }

  const rawItems = candidate.items;
  const validItems = Array.isArray(rawItems) ? rawItems.filter(isReceiptItem) : [];
  if (validItems.length === 0) {
    filledFields.push('items');
  }
  data.items = validItems.length > 0 ? validItems : defaultReceiptData.items.map((item) => ({ ...item }));

  // Always recomputed, never trusted from the file — the same invariant `withItems` enforces,
  // so an imported receipt can't ship a ВКУПЕН ПРОМЕТ that contradicts its line items.
  data.total = sumItems(data.items);

  return { status: 'ok', data, filledFields };
}
