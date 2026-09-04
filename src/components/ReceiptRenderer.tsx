'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ReceiptData } from '@/types/receipt';
import { Button } from '@/components/ui/button';
// The `browser` subpath, not the bare package: bwip-js's root export only declares
// browser/node/electron/react-native conditions, none of which `moduleResolution: "bundler"`
// matches, so the bare specifier resolves to no type declarations at all.
import bwipjs from 'bwip-js/browser';
import {
  DatamatrixOptions,
  RECEIPT_WIDTH,
  Receipt2DContext,
  ReceiptRenderDeps,
  RawSymbol,
  calculateReceiptHeight,
  renderReceipt,
} from '@/lib/receipt-render';
import { DecodeMessage } from '@/lib/datamatrix';

interface ReceiptRendererProps {
  receiptData: ReceiptData;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  /**
   * Display scale only. 1 = one canvas pixel per CSS pixel. The backing store stays 384px
   * wide at every value, so the downloaded/shared PNG is unaffected by zoom.
   */
  zoom?: number;
  /** The scrolling viewport around the canvas — the parent measures it for Fit/Fill. */
  scrollRef?: React.Ref<HTMLDivElement>;
}

/** An offscreen DOM canvas for the datamatrix module grid. */
function createSurface(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { image: canvas, ctx: ctx as unknown as Receipt2DContext };
}

/** `raw()` returns either a linear or a module-grid symbol; only the latter is drawable here. */
function rawSymbol(options: DatamatrixOptions): RawSymbol | null {
  const [symbol] = bwipjs.raw(options);
  return symbol && 'pixs' in symbol ? symbol : null;
}

export default function ReceiptRenderer({ receiptData, onCanvasReady, zoom = 1, scrollRef }: ReceiptRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const t = useTranslations();

  /**
   * Paints the decode failure where the symbol would have gone, so the preview shows what went
   * wrong instead of a silent gap. save/restore so a failure can't leave the context red and
   * 12px for everything drawn after it.
   */
  const paintDatamatrixFailure = useCallback(
    (ctx: Receipt2DContext, message: DecodeMessage, y: number) => {
      ctx.save();
      ctx.font = '12px monospace';
      ctx.fillStyle = 'red';
      ctx.textAlign = 'center';
      ctx.fillText(t(message.key, message.values), RECEIPT_WIDTH / 2, y + 20);
      ctx.restore();
    },
    [t]
  );

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

    const width = RECEIPT_WIDTH;
    const height = calculateReceiptHeight(receiptData);

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const deps: ReceiptRenderDeps = {
      logo: logoImage,
      createSurface,
      rawSymbol,
      // The generic the CSS stack has always used; the browser resolves it to a real face.
      fontFallback: 'monospace',
      onDatamatrixFailure: paintDatamatrixFailure,
    };
    // The DOM context is wider than what the renderer declares it needs; see Receipt2DContext.
    renderReceipt(ctx as unknown as Receipt2DContext, receiptData, width, deps);
    setIsRendered(true);

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [receiptData, onCanvasReady, logoImage, paintDatamatrixFailure]);

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-4">
      {/* The paper. Pure #FFFFFF behind a #FFFFFF raster, so the canvas edge disappears and
          the receipt reads as one continuous strip; the mask tears the top and bottom edges.
          It flexes to fill its container at every breakpoint — the mobile sheet below xl, the
          fixed-height sticky column at xl — and the canvas scrolls inside it. */}
      <div className="flex min-h-0 flex-1 flex-col drop-shadow-[0_6px_18px_rgb(26_23_20/0.13)]">
        <div className="perforated flex min-h-0 flex-1 flex-col bg-sheet px-4 py-7">
          <div ref={scrollRef} className="native-scroll scrollbar-hide min-h-0 flex-1 overflow-auto">
            {/* w-fit + min-w-full: centres the canvas while it is narrower than the container,
                and stops the classic `mx-auto` overflow bug from making the left edge
                unreachable once zoom makes it wider. */}
            <div className="w-fit min-w-full">
              <canvas
                ref={canvasRef}
                className="mx-auto block"
                style={{
                  width: RECEIPT_WIDTH * zoom,
                  height: 'auto',
                  // 1-bit pixel font: smooth scaling merges stems and can erase the comma
                  // in "22,74". Nearest-neighbour keeps every scaled pixel square.
                  imageRendering: 'pixelated',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {isRendered && (
        <div className="grid w-full shrink-0 grid-cols-2 gap-2">
          <Button onClick={downloadReceipt}>{t('downloadReceipt')}</Button>
          <Button onClick={shareReceipt} variant="outline">
            {t('shareReceipt')}
          </Button>
        </div>
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

  async function shareReceipt() {
    if (!canvasRef.current) return;

    let file: File;
    try {
      // Built synchronously so navigator.share() stays inside the click's user
      // activation window - iOS Safari rejects the call otherwise.
      file = canvasToPngFile(canvasRef.current, `receipt-${receiptData.receiptNumber}.png`);
    } catch (error) {
      console.error('Error preparing share:', error);
      downloadReceipt();
      return;
    }

    // Share the image on its own. Adding title/text makes iOS treat this as a
    // multi-item share and hides every target that only accepts an image.
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
      downloadReceipt();
      return;
    }

    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      // User dismissed the share sheet - not a failure, don't download.
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
        downloadReceipt();
      }
    }
  }
}

function canvasToPngFile(canvas: HTMLCanvasElement, name: string): File {
  const base64 = canvas.toDataURL('image/png').split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type: 'image/png' });
}
