import { ReceiptData } from '@/types/receipt';

export interface ReceiptPreset {
  id: string;
  name: string;
  data: ReceiptData;
}

export interface CustomPreset extends ReceiptPreset {
  createdAt: string;
}

export const CUSTOM_PRESETS_STORAGE_KEY = 'receipt-custom-presets';

export const defaultReceiptData: ReceiptData = {
  receiptType: 'ФИСКАЛНА СМЕТКА',
  storeName: 'ГРАНДПРОМ - ЗУР Д.О.О.Е.Л.',
  address: 'УЛИЦА 7 260 СКОПЈЕ',
  taxNumber: '4028011514916',
  vatNumber: 'МК4208011514916',
  items: [
    { name: 'Coffee', quantity: 2, price: 3.5, vatType: 'A', isDomestic: false },
    { name: 'Sandwich', quantity: 1, price: 8.99, vatType: 'A', isDomestic: false },
    { name: 'Pastry', quantity: 3, price: 2.25, vatType: 'B', isDomestic: false },
  ],
  vatTypeA: 18,
  vatTypeB: 5,
  vatTypeV: 0,
  vatTypeG: 0,
  total: 24.74,
  paymentMethod: 'ВО ГОТОВО',
  receiptNumber: '0012',
  date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
  dateTextFlag: false,
  time: new Date().toLocaleTimeString('mk-MK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }),
  datamatrixCode:
    'AC455104813AC455104813AC00217425hffhjfhjkhdjkdfhjkdfhdfjklhfdjkfjkdfhdfjklhdfdjfkdfhjklfhkidfgkloptrjkhrjkghkjghgkhgkfhghgkhgfhjkgdfjkghfjkghfgjkdfhgjkhggkjhfgkjfhgkhgdfkjh',
  datamatrixSize: 197,
  fiscalLogoSize: 190,
  headerFontSize: 22,
  headerFontSpacing: 30,
  bodyFontSize: 22,
  bodyFontSpacing: 32,
  bodyFontFamily: 'PixelFont',
  headerFontFamily: 'PixelFont',
  headerFontDoubleWidth: true,
};

export const builtInPresets: ReceiptPreset[] = [
  {
    id: 'builtin:default',
    name: 'Default Cafe',
    data: defaultReceiptData,
  },
  {
    id: 'builtin:market',
    name: 'Market Basket',
    data: {
      ...defaultReceiptData,
      storeName: 'МАРКЕТ ПЛУС ДООЕЛ',
      address: 'БУЛ. ИЛИНДЕН 45 СКОПЈЕ',
      receiptNumber: '0148',
      items: [
        { name: 'Млеко 1L', quantity: 2, price: 68, vatType: 'B', isDomestic: true },
        { name: 'Леб бел 500g', quantity: 1, price: 35, vatType: 'B', isDomestic: true },
        { name: 'Сок портокал 1.5L', quantity: 1, price: 92.5, vatType: 'A', isDomestic: false },
      ],
      total: 263.5,
      paymentMethod: 'ВО ГОТОВО',
      datamatrixSize: 180,
      fiscalLogoSize: 170,
      bodyFontFamily: 'Courier New',
      headerFontFamily: 'Courier New',
      headerFontDoubleWidth: false,
    },
  },
  {
    id: 'builtin:restaurant',
    name: 'Restaurant Bill',
    data: {
      ...defaultReceiptData,
      storeName: 'РЕСТОРАН СТАРА КУЌА',
      address: 'КЕЈ 13 НОЕМВРИ 8 СКОПЈЕ',
      receiptNumber: '1024',
      items: [
        { name: 'Телешка чорба', quantity: 2, price: 150, vatType: 'A', isDomestic: true },
        { name: 'Скара микс', quantity: 1, price: 480, vatType: 'A', isDomestic: true },
        { name: 'Минерална вода', quantity: 3, price: 55, vatType: 'B', isDomestic: false },
      ],
      total: 945,
      paymentMethod: 'НА КРЕДИТ',
      datamatrixSize: 210,
      fiscalLogoSize: 200,
      bodyFontFamily: 'Consolas',
      headerFontFamily: 'Impact',
    },
  },
];

function isReceiptItem(value: unknown): value is ReceiptData['items'][number] {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.name === 'string' &&
    typeof item.quantity === 'number' &&
    typeof item.price === 'number' &&
    (item.vatType === 'A' || item.vatType === 'B' || item.vatType === 'V' || item.vatType === 'G') &&
    typeof item.isDomestic === 'boolean'
  );
}

function isReceiptData(value: unknown): value is ReceiptData {
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
    data.items.every(isReceiptItem) &&
    typeof data.vatTypeA === 'number' &&
    typeof data.vatTypeB === 'number' &&
    typeof data.vatTypeV === 'number' &&
    typeof data.vatTypeG === 'number' &&
    typeof data.total === 'number' &&
    typeof data.paymentMethod === 'string' &&
    typeof data.receiptNumber === 'string' &&
    typeof data.date === 'string' &&
    typeof data.dateTextFlag === 'boolean' &&
    typeof data.time === 'string' &&
    typeof data.datamatrixCode === 'string' &&
    typeof data.datamatrixSize === 'number' &&
    typeof data.fiscalLogoSize === 'number' &&
    typeof data.bodyFontSize === 'number' &&
    typeof data.headerFontSize === 'number' &&
    typeof data.headerFontSpacing === 'number' &&
    typeof data.bodyFontSpacing === 'number' &&
    typeof data.bodyFontFamily === 'string' &&
    typeof data.headerFontFamily === 'string' &&
    typeof data.headerFontDoubleWidth === 'boolean'
  );
}

function isCustomPreset(value: unknown): value is CustomPreset {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const preset = value as Record<string, unknown>;

  return (
    typeof preset.id === 'string' &&
    typeof preset.name === 'string' &&
    typeof preset.createdAt === 'string' &&
    isReceiptData(preset.data)
  );
}

export function loadCustomPresets(): CustomPreset[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isCustomPreset);
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: CustomPreset[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(presets));
}
