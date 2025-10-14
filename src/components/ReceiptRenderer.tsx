'use client';

import { useRef, useEffect, useState } from 'react';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReceiptData {
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
}

interface ReceiptRendererProps {
  receiptData: ReceiptData;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function ReceiptRenderer({ receiptData, onCanvasReady }: ReceiptRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);

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

    renderReceipt(ctx, receiptData, width);
    setIsRendered(true);
    
    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [receiptData, onCanvasReady]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas 
        ref={canvasRef}
        className="border border-gray-300 shadow-lg"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {isRendered && (
        <button
          onClick={downloadReceipt}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Download Receipt
        </button>
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
  const headerHeight = 120;
  const itemHeight = 20;
  const itemsHeight = data.items.length * itemHeight;
  const footerHeight = 140;
  const padding = 40;
  
  return headerHeight + itemsHeight + footerHeight + padding;
}

function renderReceipt(ctx: CanvasRenderingContext2D, data: ReceiptData, width: number) {
  const padding = 0;
  let y = 20;

  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';

  ctx.font = 'bold 20px monospace';
  ctx.fillText(data.receiptType, width / 2, y);
  y += 20;
  ctx.fillText(`#${data.receiptNumber}`, width / 2, y);
  y += 16;

  ctx.font = '18px monospace';
  ctx.fillText(data.storeName, width / 2, y);
  y += 16;
  ctx.fillText(data.address, width / 2, y);
  y += 16;
  ctx.fillText(data.vatNumber, width / 2, y);
  y += 30;

  ctx.textAlign = 'left';

  

  data.items.forEach(item => {
    const itemLine = `${item.quantity}x ${item.name}`;
    const priceText = `$${item.total.toFixed(2)}`;
    
    ctx.fillText(itemLine, padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(priceText, width - padding, y);
    ctx.textAlign = 'left';
    y += 20;
  });

  ctx.fillText("- - - - - - - - - - - - - - - - - -", padding, y);
  y += 20;
  //18


  ctx.textAlign = 'right';
  if (data.vatTypeA > 0) {
    ctx.fillText(`VAT A: $${data.vatTypeA.toFixed(2)}`, width - padding, y);
    y += 16;
  }
  if (data.vatTypeB > 0) {
    ctx.fillText(`VAT B: $${data.vatTypeB.toFixed(2)}`, width - padding, y);
    y += 16;
  }
  if (data.vatTypeV > 0) {
    ctx.fillText(`VAT V: $${data.vatTypeV.toFixed(2)}`, width - padding, y);
    y += 16;
  }
  if (data.vatTypeG > 0) {
    ctx.fillText(`VAT G: $${data.vatTypeG.toFixed(2)}`, width - padding, y);
    y += 16;
  }
  
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`Total: $${data.total.toFixed(2)}`, width - padding, y);
  y += 30;

  ctx.font = '18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText("- - - - - - - - - - - - - - - - - -", padding, y);
  y += 20;

  // ctx.font = '12px monospace';
  // ctx.textAlign = 'center';
  ctx.fillText(`${data.paymentMethod}`, padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(data.total.toFixed(2), width - padding, y);
  y += 20;
  ctx.fillText('Thank you for your purchase!', padding, y);
}

function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.stroke();
}