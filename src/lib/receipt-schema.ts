import { ReceiptData } from '@/types/receipt';

/**
 * `typeof NaN === 'number'`, so a plain typeof check would let NaN/Infinity through from
 * localStorage and straight into the canvas geometry (a NaN height renders nothing at all).
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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
  datamatrixSize: { min: 50, max: 300 },
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
