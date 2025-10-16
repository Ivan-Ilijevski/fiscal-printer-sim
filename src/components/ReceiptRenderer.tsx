'use client';

import { useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ReceiptData } from '@/types/receipt';
import { calculateDomesticVAT, calculateVAT } from '@/utils/VATCalc';
import { Button } from '@/components/ui/button';
import bwipjs from 'bwip-js';

interface ReceiptRendererProps {
  receiptData: ReceiptData;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function ReceiptRenderer({ receiptData, onCanvasReady }: ReceiptRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const t = useTranslations();

  // Preload the fiscal logo image
  useEffect(() => {
    const img = new window.Image();
    img.src = '/fiscalLogo.png';
    img.onload = () => {
      setLogoImage(img);
    };
    img.onerror = () => {
      console.error('Failed to load fiscal logo');
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 384;
    const height = calculateReceiptHeight(receiptData);

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    renderReceipt(ctx, receiptData, width, logoImage);
    setIsRendered(true);

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [receiptData, onCanvasReady, logoImage]);

  return (
    <div className="flex flex-col items-center gap-8">
    
        <canvas 
          ref={canvasRef}
          className=" shadow-lg"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      
      {isRendered && (
        <Button
          onClick={downloadReceipt}
          className="w-full backdrop-blur-md bg-white/15 border border-white/25 text-slate-700 hover:bg-white/20 hover:border-white/30 h-12 text-lg font-light tracking-wide transition-all duration-200"
        >
          {t('downloadReceipt')}
        </Button>
      )}
    </div>
  );

  function downloadReceipt() {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = `receipt-${receiptData.receiptNumber}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  }
}

function calculateReceiptHeight(data: ReceiptData): number {
  // Header: receipt type + number + store info (4 lines)
  const headerHeight = (data.headerFontSpacing * 2) + (data.bodyFontSpacing * 3) + 60;

  // Items
  const itemsHeight = data.items.length * data.bodyFontSpacing;

  // VAT sections and totals (approximately 15-20 lines)
  const vatSectionHeight = data.bodyFontSpacing * 20;

  // Datamatrix and logo
  const datamatrixHeight = data.datamatrixCode ? data.datamatrixSize + 10 : 0;
  const logoHeight = data.fiscalLogoSize ? (data.fiscalLogoSize / (2120 / 981)) + 20 : 0;

  const padding = 100;

  return headerHeight + itemsHeight + vatSectionHeight + datamatrixHeight + logoHeight + padding;
}

function renderReceipt(ctx: CanvasRenderingContext2D, data: ReceiptData, width: number, logoImage: HTMLImageElement | null) {
  const padding = 0;
  let y = data.headerFontSize + 10; // Start with enough space for first line

  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';

  ctx.font = `bold ${data.headerFontSize}px "Courier New", monospace`;
  ctx.fillText(data.receiptType, width / 2, y);
  y += data.headerFontSpacing;
  ctx.fillText(`#${data.receiptNumber}`, width / 2, y);
  y += data.headerFontSpacing;

  ctx.font = `${data.bodyFontSize}px monospace`;
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

    ctx.fillText(`${item.name}`, padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(priceText, width - padding, y);
    ctx.textAlign = 'left';
    y += data.bodyFontSpacing;
  });

  {/* Промет од македонски производи */}
  ctx.fillText("- - - - - - - - - - - - - - - -", padding, y);
  y += data.bodyFontSpacing;
  //18
  

  const dVatA = calculateDomesticVAT(data, 'A');
  const dVatB = calculateDomesticVAT(data, 'B');
  const dVatV = calculateDomesticVAT(data, 'V');
  const dVatG = calculateDomesticVAT(data, 'G');


  ctx.font = `${data.bodyFontSize}px monospace`;
  ctx.fillText(`ПРОМЕТ ОД МАКЕДОНСКИ ПР.`,padding, y);
  ctx.textAlign = 'right';
  ctx.fillText((dVatA + dVatB + dVatV + dVatG).toFixed(2).replace('.', ','), width - padding, y);
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
  ctx.fillText("- - - - - - - - - - - - - - - - -", padding, y);
  y += data.bodyFontSpacing;
  //18
  

  const vatA = calculateVAT(data, 'A');
  const vatB = calculateVAT(data, 'B');
  const vatV = calculateVAT(data, 'V');
  const vatG = calculateVAT(data, 'G');


  ctx.font = `bold ${data.bodyFontSize}px monospace`;
  ctx.fillText(`ВКУПЕН ПРОМЕТ`,padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.total.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing;

  ctx.font = `${data.bodyFontSize}px monospace`;

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
  ctx.fillText("--------------------------------", padding, y);
  y += data.bodyFontSpacing;

  // ctx.font = '12px monospace';
  // ctx.textAlign = 'center';
  ctx.fillText('ВИ БЛАГОДАРИМЕ!', padding, y);
  y += data.bodyFontSpacing ;
  ctx.fillText(`${data.paymentMethod}`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.total.toFixed(2).replace('.', ','), width - padding, y);
  y += data.bodyFontSpacing/2;
  ctx.textAlign = 'left';
  

  // Render 2x2 datamatrix
  if (data.datamatrixCode) {
    render2x2Datamatrix(ctx, data.datamatrixCode, data.datamatrixSize, width, y);
  }

  y += data.datamatrixSize + data.bodyFontSpacing;

  ctx.fillText(`0035120`, padding, y);
  ctx.textAlign = 'center';
  ctx.fillText(`${data.dateTextFlag ? 'ДАТУМ ' : ''}${data.date}`, width / 2, y);
  ctx.textAlign = 'right';

  ctx.fillText(`${data.time}`, width - padding, y);
  y += data.bodyFontSpacing/2;

  // Render fiscal logo if image is loaded
  if (logoImage) {
    // Original image dimensions: 2120 x 981
    const aspectRatio = 2120 / 981;
    const logoWidth = data.fiscalLogoSize;
    const logoHeight = data.fiscalLogoSize / aspectRatio;
    ctx.drawImage(logoImage, padding, y, logoWidth, logoHeight);
  }

  y += (data.fiscalLogoSize / (2120 / 981))/2 ;

  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.font = `bold ${data.bodyFontSize + 2}px monospace`;
  ctx.fillText('АС456784334', width - padding - 20, y - data.bodyFontSpacing/4);
  ctx.textBaseline = 'top';
  ctx.fillText('АС564323389', width - padding - 20, y + data.bodyFontSpacing/4);

  y += (data.fiscalLogoSize / (2120 / 981))/2 + data.headerFontSpacing;


  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold ${data.headerFontSize}px "Courier New", monospace`;
  ctx.fillText(data.receiptType, width / 2, y);

  y += data.bodyFontSpacing * 2;
  ctx.textAlign = 'left';
  ctx.font = `${data.bodyFontSize}px monospace`;
  ctx.fillText("--------------------------------", padding, y);
  

}

function render2x2Datamatrix(ctx: CanvasRenderingContext2D, code: string, displaySize: number, canvasWidth: number, y: number) {
  try {
    // Generate the full datamatrix using bwip-js
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, {
      bcid: 'datamatrix',
      text: code,
      scale: 3,
      includetext: false,
    });

    // Get the dimensions of the generated datamatrix
    const dmWidth = canvas.width;
    const dmHeight = canvas.height;

    // Center position
    const startX = (canvasWidth - displaySize) / 2;

    // Draw the complete datamatrix (scannable)
    ctx.drawImage(
      canvas,
      0, 0, dmWidth, dmHeight, // source - entire datamatrix
      startX, y, displaySize, displaySize // destination - centered
    );

    // Draw a black cross overlay to visually divide into 4 segments
    // without actually breaking the datamatrix pattern underneath
    ctx.fillStyle = 'black';
    const crossWidth = 2; // Width of the cross lines
    const halfSize = displaySize / 2;

    // Vertical line of the cross (center)
    ctx.fillRect(startX + halfSize - crossWidth / 2, y, crossWidth, displaySize);
    // Horizontal line of the cross (center)
    ctx.fillRect(startX, y + halfSize - crossWidth / 2, displaySize, crossWidth);
  } catch (error) {
    console.error('Error generating datamatrix:', error);
    // Fallback: draw error message
    ctx.font = '12px monospace';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.fillText('Error generating datamatrix', canvasWidth / 2, y + 20);
    
  }
    

}

