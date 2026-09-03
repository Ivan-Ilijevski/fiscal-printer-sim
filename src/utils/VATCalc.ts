import { ReceiptData, ReceiptItem } from '@/types/receipt';

export type VatType = 'A' | 'B' | 'V' | 'G';

/**
 * Gross (tax-inclusive) amount for a single line item, in denars.
 * Guards against NaN/Infinity arriving from a hand-edited form field or a stored preset.
 */
export function itemGross(item: ReceiptItem): number {
  const gross = item.price * item.quantity;
  return Number.isFinite(gross) ? gross : 0;
}

/** Total промет for a set of items — the amount actually paid, VAT included. */
export function sumItems(items: ReceiptItem[], include: (item: ReceiptItem) => boolean = () => true): number {
  return Number(items.reduce((sum, item) => (include(item) ? sum + itemGross(item) : sum), 0).toFixed(2));
}

function vatRate(data: ReceiptData, vatType: VatType): number {
  const rates: Record<VatType, number> = {
    A: data.vatTypeA,
    B: data.vatTypeB,
    V: data.vatTypeV,
    G: data.vatTypeG,
  };
  const rate = rates[vatType];
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

/**
 * Item prices are tax-inclusive: the ДДВ is contained in the промет rather than added on top,
 * so it is extracted backward out of the gross rather than applied as a markup.
 *   vat = gross - gross / (1 + rate/100) = gross * rate / (100 + rate)
 */
function extractVAT(gross: number, rate: number): number {
  return rate > 0 ? (gross * rate) / (100 + rate) : 0;
}

function sumVAT(data: ReceiptData, vatType: VatType, include: (item: ReceiptItem) => boolean): number {
  const rate = vatRate(data, vatType);
  const total = data.items.reduce(
    (sum, item) => (item.vatType === vatType && include(item) ? sum + extractVAT(itemGross(item), rate) : sum),
    0
  );
  return Number(total.toFixed(2));
}

/** ДДВ contained in the total промет for one VAT band. */
export function calculateVAT(data: ReceiptData, vatType: VatType): number {
  return sumVAT(data, vatType, () => true);
}

/** ДДВ contained in the промет from Macedonian sources for one VAT band. */
export function calculateDomesticVAT(data: ReceiptData, vatType: VatType): number {
  return sumVAT(data, vatType, (item) => item.isDomestic);
}

/** ПРОМЕТ ОД МАКЕДОНСКИ ПР. — the amount paid, in denars, that comes from a Macedonian source. */
export function calculateDomesticSum(data: ReceiptData): string {
  return sumItems(data.items, (item) => item.isDomestic)
    .toFixed(2)
    .replace('.', ',');
}
