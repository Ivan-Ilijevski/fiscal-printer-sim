import { ReceiptData } from '@/types/receipt';

export function calculateVAT(data: ReceiptData, vatType: 'A' | 'B' | 'V' | 'G'): number{
    let total = 0;
    let VAT : number;
    if (vatType === 'A') {
        VAT = data.vatTypeA;
    } else if (vatType === 'B') {
        VAT = data.vatTypeB;
    } else if (vatType === 'V') {
        VAT = data.vatTypeV;
    } else if (vatType === 'G') {
        VAT = data.vatTypeG;
    }
  data.items.forEach(item => {
    if (item.vatType === vatType) {
      total += item.price * VAT * item.quantity / 100;
    }
  });
  return Number(total.toFixed(2));
}

export function calculateDomesticVAT(data: ReceiptData, vatType: 'A' | 'B' | 'V' | 'G'): number{
    let total = 0;
    let VAT : number;
    if (vatType === 'A') {
        VAT = data.vatTypeA;
    } else if (vatType === 'B') {
        VAT = data.vatTypeB;
    } else if (vatType === 'V') {
        VAT = data.vatTypeV;
    } else if (vatType === 'G') {
        VAT = data.vatTypeG;
    }
  data.items.forEach(item => {
    if (item.vatType === vatType && item.isDomestic) {
      total += item.price * VAT * item.quantity / 100;
    }
  });
  return Number(total.toFixed(2));
}