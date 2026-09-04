import { ReceiptData, ReceiptItem } from '@/types/receipt';
import { sumItems } from '@/utils/VATCalc';
import { isReceiptData } from '@/lib/receipt-schema';

export interface ReceiptPreset {
  id: string;
  name: string;
  data: ReceiptData;
}

export interface CustomPreset extends ReceiptPreset {
  createdAt: string;
}

export const CUSTOM_PRESETS_STORAGE_KEY = 'receipt-custom-presets';

/**
 * Builds a receipt whose `total` is always the sum of its own items, so a preset can never
 * ship a ВКУПЕН ПРОМЕТ that contradicts its line items. Items are copied so each preset owns
 * its own array rather than sharing the module-level one.
 */
function withItems(base: Omit<ReceiptData, 'total'>, items: ReceiptItem[]): ReceiptData {
  const ownItems = items.map((item) => ({ ...item }));
  return { ...base, items: ownItems, total: sumItems(ownItems) };
}

const defaultItems: ReceiptItem[] = [
  { name: 'Нескафе', quantity: 2, price: 120, vatType: 'A', isDomestic: false },
  { name: 'Сендвич', quantity: 1, price: 420, vatType: 'A', isDomestic: true },
  { name: 'Домашен колбас парче', quantity: 1, price: 120, vatType: 'B', isDomestic: false },
];

export const defaultReceiptData: ReceiptData = withItems(
  {
  receiptType: 'ФИСКАЛНА СМЕТКА',
  storeName: 'ГРАНДПРОМ - ЗУР Д.О.О.Е.Л.',
  address: 'УЛИЦА 7 260 СКОПЈЕ',
  taxNumber: '4028011514916',
  vatNumber: 'МК4208011514916',
  items: defaultItems,
  vatTypeA: 18,
  vatTypeB: 5,
  vatTypeV: 0,
  vatTypeG: 0,
  paymentMethod: 'ВО ГОТОВО',
  receiptNumber: '0012',
  // Placeholders only. Filled with the real clock on the client after mount — a module-level
  // `new Date()` is evaluated once per process, which both goes stale on a long-running server
  // and differs between the server and client renders (hydration mismatch).
  date: '',
  dateTextFlag: false,
  time: '',
  // text + auto reproduces the pre-encodings rendering exactly: `decodeBytes(..., 'text')`
  // yields the same bytes bwip-js derived internally, and `auto` is its own encodation choice.
  datamatrixCode:
    '4143343135313030383231414334313538313730313841433030323539323937E39F0000000000006FB86F71226A5AA44A92478B0E5B81BE513D9226045A0EC3489F53FB5D871B668C8355964BEC7585C84D965751147D482AC12783A5A0D981FDDFCA56A96FFA5CEB17A930DFF46177881447D0BAE87BBB17F87DD6D97A5FD007D49744C24FB28B',
  datamatrixCodeEncoding: 'hex',
  datamatrixEncodation: 'base256',
  // Only consulted in base256 mode. 48x48 is what Macedonian fiscal devices emit, and it is
  // NOT the smallest size that fits a typical payload — so it has to be stated, not derived.
  datamatrixSymbolSize: 48,
  datamatrixSize: 197,
  // The slider is taken literally. `crisp` instead rounds down to whole pixels per module,
  // which is the evener thermal raster but only reaches multiples of the module count.
  datamatrixScaling: 'exact',
  fiscalLogoSize: 190,
  headerFontSize: 22,
  headerFontSpacing: 30,
  bodyFontSize: 22,
  bodyFontSpacing: 32,
  bodyFontFamily: 'PixelFontWide',
  headerFontFamily: 'PixelFontWide',
  headerFontDoubleWidth: true,
  },
  defaultItems
);


/** Current date/time in the formats the receipt expects (DD-MM-YYYY, HH:MM:SS). Client-side only. */
export function currentDateTime(): { date: string; time: string } {
  const now = new Date();
  return {
    date: now.toLocaleDateString('en-GB').replace(/\//g, '-'),
    // hour12 must be explicit: without it this resolves to a 12-hour clock in some runtimes,
    // producing "02:58:09 PM", which both breaks the documented HH:MM:SS format and is wide
    // enough to collide with the centred date on the same line.
    time: now.toLocaleTimeString('mk-MK', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  };
}

export const builtInPresets: ReceiptPreset[] = [
  {
    id: 'builtin:default',
    name: 'Default Cafe',
    data: defaultReceiptData,
  },
  {
    id: 'builtin:market',
    name: 'Market Basket',
    data: withItems(
      {
        ...defaultReceiptData,
        storeName: 'МАРКЕТ ПЛУС ДООЕЛ',
        address: 'БУЛ. ИЛИНДЕН 45 СКОПЈЕ',
        receiptNumber: '0148',
        paymentMethod: 'ВО ГОТОВО',
        datamatrixSize: 180,
        fiscalLogoSize: 170,
        bodyFontFamily: 'Courier New',
        headerFontFamily: 'Courier New',
        headerFontDoubleWidth: false,
      },
      [
        { name: 'Млеко 1L', quantity: 2, price: 68, vatType: 'B', isDomestic: true },
        { name: 'Леб бел 500g', quantity: 1, price: 35, vatType: 'B', isDomestic: true },
        { name: 'Сок портокал 1.5L', quantity: 1, price: 92.5, vatType: 'A', isDomestic: false },
      ]
    ),
  },
  {
    id: 'builtin:restaurant',
    name: 'Restaurant Bill',
    data: withItems(
      {
        ...defaultReceiptData,
        storeName: 'РЕСТОРАН СТАРА КУЌА',
        address: 'КЕЈ 13 НОЕМВРИ 8 СКОПЈЕ',
        receiptNumber: '1024',
        paymentMethod: 'НА КРЕДИТ',
        datamatrixSize: 210,
        fiscalLogoSize: 200,
        bodyFontFamily: 'Consolas',
        headerFontFamily: 'Impact',
      },
      [
        { name: 'Телешка чорба', quantity: 2, price: 150, vatType: 'A', isDomestic: true },
        { name: 'Скара микс', quantity: 1, price: 480, vatType: 'A', isDomestic: true },
        { name: 'Минерална вода', quantity: 3, price: 55, vatType: 'B', isDomestic: false },
      ]
    ),
  },
];

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

/**
 * Returns false when the write failed (quota exceeded, storage blocked in private browsing)
 * rather than throwing out of a click handler, so the caller can report it.
 */
export function saveCustomPresets(presets: CustomPreset[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch {
    return false;
  }
}
