import { ReceiptData } from '@/types/receipt';

export function isPayloadEncoding(value: unknown): value is ReceiptData['datamatrixCodeEncoding'] {
  return value === 'text' || value === 'hex' || value === 'base64';
}

export function isEncodation(value: unknown): value is ReceiptData['datamatrixEncodation'] {
  return value === 'auto' || value === 'base256';
}

export function isModuleScaling(value: unknown): value is ReceiptData['datamatrixScaling'] {
  return value === 'exact' || value === 'crisp';
}

/**
 * `typeof NaN === 'number'`, so a plain typeof check would let NaN/Infinity through from
 * localStorage and straight into the canvas geometry (a NaN height renders nothing at all).
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Absent is fine; present-but-wrong is not. Lets older saved receipts pass unchanged. */
function isOptional(value: unknown, guard: (value: unknown) => boolean): boolean {
  return value === undefined || guard(value);
}

export function isReceiptItem(value: unknown): value is ReceiptData['items'][number] {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.name === 'string' &&
    isFiniteNumber(item.quantity) &&
    isFiniteNumber(item.price) &&
    (item.vatType === 'A' || item.vatType === 'B' || item.vatType === 'V' || item.vatType === 'G') &&
    typeof item.isDomestic === 'boolean'
  );
}

export function isReceiptData(value: unknown): value is ReceiptData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.receiptType === 'string' &&
    typeof data.storeName === 'string' &&
    typeof data.address === 'string' &&
    typeof data.taxNumber === 'string' &&
    typeof data.vatNumber === 'string' &&
    Array.isArray(data.items) &&
    data.items.length > 0 &&
    data.items.every(isReceiptItem) &&
    isFiniteNumber(data.vatTypeA) &&
    isFiniteNumber(data.vatTypeB) &&
    isFiniteNumber(data.vatTypeV) &&
    isFiniteNumber(data.vatTypeG) &&
    isFiniteNumber(data.total) &&
    typeof data.paymentMethod === 'string' &&
    typeof data.receiptNumber === 'string' &&
    typeof data.date === 'string' &&
    typeof data.dateTextFlag === 'boolean' &&
    typeof data.time === 'string' &&
    typeof data.datamatrixCode === 'string' &&
    // Optional: a preset saved before payload encodings existed has none of these. Requiring
    // them would make this guard reject every such entry, and `loadCustomPresets` filters on
    // it — the user's saved presets would silently vanish from the list.
    isOptional(data.datamatrixCodeEncoding, isPayloadEncoding) &&
    isOptional(data.datamatrixEncodation, isEncodation) &&
    isOptional(data.datamatrixSymbolSize, isFiniteNumber) &&
    isOptional(data.datamatrixScaling, isModuleScaling) &&
    isFiniteNumber(data.datamatrixSize) &&
    isFiniteNumber(data.fiscalLogoSize) &&
    isFiniteNumber(data.bodyFontSize) &&
    isFiniteNumber(data.headerFontSize) &&
    isFiniteNumber(data.headerFontSpacing) &&
    isFiniteNumber(data.bodyFontSpacing) &&
    typeof data.bodyFontFamily === 'string' &&
    typeof data.headerFontFamily === 'string' &&
    typeof data.headerFontDoubleWidth === 'boolean'
  );
}

// The sliders and number inputs declare these bounds; typing into the number input
// bypasses them, and an empty or non-numeric field yields 0/NaN. A NaN spacing propagates
// into the canvas geometry and renders a blank receipt, so every numeric field is clamped here.
// Shared between the form and the file importer, which must clamp identically — a NaN or
// out-of-range spacing arriving from either path is the same failure mode.
export const numericFieldBounds: Record<string, { min: number; max: number }> = {
  // Up to the full 384px print width. Every integer in the range is reachable under `exact`
  // scaling, so the bound is the only thing limiting it.
  datamatrixSize: { min: 50, max: 384 },
  // In modules, not pixels. 0 = auto; 144 is the largest ECC200 square.
  datamatrixSymbolSize: { min: 0, max: 144 },
  fiscalLogoSize: { min: 50, max: 384 },
  headerFontSize: { min: 10, max: 50 },
  headerFontSpacing: { min: 5, max: 50 },
  bodyFontSize: { min: 10, max: 50 },
  bodyFontSpacing: { min: 5, max: 50 },
};

export function clampNumeric(
  value: string | number,
  { min, max, fallback }: { min: number; max: number; fallback: number }
) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}
