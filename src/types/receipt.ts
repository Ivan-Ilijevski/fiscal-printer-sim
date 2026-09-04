export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  vatType: 'A' | 'B' | 'V' | 'G';
  isDomestic: boolean;
}

export interface ReceiptData {
  receiptType: string;
  storeName: string;
  address: string;
  taxNumber: string;
  vatNumber: string;
  items: ReceiptItem[];
  vatTypeA: number;
  vatTypeB: number;
  vatTypeV: number;
  vatTypeG: number;
  total: number;
  paymentMethod: string;
  receiptNumber: string;
  date: string;
  dateTextFlag: boolean;
  time: string;
  datamatrixCode: string;
  datamatrixCodeEncoding: 'text' | 'hex' | 'base64';
  /**
   * `auto` lets bwip-js choose a compact mixed encodation; `base256` reproduces what fiscal
   * devices emit — pure Base256 over the whole payload. Both carry identical bytes, but only
   * `base256` lays out the same modules as the scanned receipt.
   */
  datamatrixEncodation: 'auto' | 'base256';
  /** Base256 pads to this size's codeword capacity. 0 = smallest that fits. Unused when `auto`. */
  datamatrixSymbolSize: number;
  /** Display size in px. Distinct from `datamatrixSymbolSize`, which is in modules. */
  datamatrixSize: number;
  /**
   * `exact` draws at `datamatrixSize` verbatim, so any size between the whole-module steps is
   * reachable; `crisp` snaps down to whole pixels per module for an even thermal raster.
   */
  datamatrixScaling: 'exact' | 'crisp';
  fiscalLogoSize: number;
  bodyFontSize: number;
  headerFontSize: number;
  headerFontSpacing: number;
  bodyFontSpacing: number;
  bodyFontFamily: string;
  headerFontFamily: string;
  headerFontDoubleWidth: boolean;
}