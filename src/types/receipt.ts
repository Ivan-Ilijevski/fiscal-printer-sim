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
  datamatrixSize: number;
  fiscalLogoSize: number;
  bodyFontSize: number;
  headerFontSize: number;
  headerFontSpacing: number;
  bodyFontSpacing: number;
}