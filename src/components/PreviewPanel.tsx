'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import ReceiptRenderer from '@/components/ReceiptRenderer';
import ZoomControls, { MAX_ZOOM, MIN_ZOOM, stepZoom, ZoomMode } from '@/components/ZoomControls';
import { ReceiptData } from '@/types/receipt';
import { formatDenar } from '@/utils/VATCalc';

const RULER_TICKS = [0, 96, 192, 288, 384];

/**
 * The app's core constraint — 384px — turned into ornament. Deliberately NOT scaled by zoom:
 * it states the receipt's real pixel width, which no display scale changes. The percentage
 * readout in the zoom controls carries the display scale.
 */
function Ruler() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="flex items-end justify-between border-b border-rule-2 pb-1">
        {RULER_TICKS.map((tick, i) => (
          <div
            key={tick}
            className="flex flex-col gap-1"
            style={{
              alignItems: i === 0 ? 'flex-start' : i === RULER_TICKS.length - 1 ? 'flex-end' : 'center',
            }}
          >
            <span className="label-mono tabular leading-none">{tick}</span>
            <span className="h-2 w-px bg-rule-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface PreviewPanelProps {
  receiptData: ReceiptData;
  /** Mobile sheet state. Ignored at xl+, where the panel is always the right-hand column. */
  open: boolean;
  onClose: () => void;
}

/*
 * One instance, two positions. Below xl this is a fixed sheet that slides up over the form;
 * at xl+ the same node becomes the sticky right-hand column. It is never unmounted or
 * conditionally rendered — remounting would re-run the canvas render on every open.
 */
export default function PreviewPanel({ receiptData, open, onClose }: PreviewPanelProps) {
  const t = useTranslations();
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState<ZoomMode>('fill');

  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Stable identity: onCanvasReady sits in ReceiptRenderer's render-effect dependency array,
  // so a fresh closure here would re-run the whole canvas render on every parent render.
  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasElRef.current = canvas;
  }, []);

  /** Measures live rather than reading state, so it can never act on a stale size. */
  const measure = useCallback((target: 'fit' | 'fill'): number | null => {
    const canvas = canvasElRef.current;
    const box = scrollRef.current;
    if (!canvas || !box || !canvas.width || !canvas.height) return null;

    const byWidth = box.clientWidth / canvas.width;
    // Fill never upscales: an uncapped fill would open the 460px desktop column at ~105%,
    // and a non-integer upscale makes a 1-bit pixel font visibly ragged.
    const raw = target === 'fill' ? Math.min(byWidth, 1) : Math.min(byWidth, box.clientHeight / canvas.height);

    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, raw));
  }, []);

  const applyMode = useCallback(
    (target: 'fit' | 'fill') => {
      const next = measure(target);
      setMode(target);
      if (next !== null) setZoom(next);
    },
    [measure]
  );

  // While in fit/fill the scale tracks the container and the receipt: rotating the phone or
  // adding items keeps the receipt correctly sized. Manual zoom freezes the number.
  // No feedback loop — the scroller is sized by flex and its parent, never by its content.
  useLayoutEffect(() => {
    if (mode === 'manual') return;
    const box = scrollRef.current;
    if (!box) return;

    const sync = () => {
      const next = measure(mode);
      if (next !== null) setZoom(next);
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(box);
    return () => observer.disconnect();
  }, [mode, measure, receiptData, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleStep = (direction: 1 | -1) => {
    setMode('manual');
    setZoom((current) => stepZoom(current, direction));
  };

  const handleReset = () => {
    setMode('manual');
    setZoom(1);
  };

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-ink/25 transition-opacity duration-300 xl:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        className={`fixed inset-0 z-50 flex flex-col bg-paper transition-transform duration-300 ease-out xl:static xl:z-auto xl:translate-y-0 xl:bg-transparent xl:transition-none ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex shrink-0 items-baseline justify-between border-b border-rule px-5 py-4 xl:border-0 xl:px-0 xl:pt-0">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">{t('livePreview')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closePreview')}
            className="label-mono -mr-2 px-2 py-1 text-ink transition-colors hover:text-stamp xl:hidden"
          >
            ✕
          </button>
        </div>

        {/* Content row: flexes so the paper absorbs the leftover height and the actions
            always sit directly above the close bar, with no dead space on any device. */}
        <div className="native-scroll flex min-h-0 flex-1 flex-col px-5 pt-4 pb-5 xl:overflow-visible xl:px-0 xl:pt-6 xl:pb-0">
          <div className="mx-auto flex min-h-0 w-full max-w-[420px] flex-1 flex-col xl:mx-0 xl:flex-none">
            <div className="shrink-0 space-y-3">
              <ZoomControls
                zoom={zoom}
                mode={mode}
                onStep={handleStep}
                onReset={handleReset}
                onFit={() => applyMode('fit')}
                onFill={() => applyMode('fill')}
              />
              <Ruler />
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col xl:flex-none">
              <ReceiptRenderer
                receiptData={receiptData}
                zoom={zoom}
                scrollRef={scrollRef}
                onCanvasReady={handleCanvasReady}
              />
            </div>
          </div>
        </div>

        {/* Close bar. Deliberately mirrors the open bar in page.tsx — same padding, same h-12
            button, same label/total split — so the preview toggles from one spot instead of
            opening at the bottom and closing at the top. */}
        <div className="pb-safe shrink-0 border-t border-rule bg-paper px-5 pt-3 xl:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-between bg-ink px-4 text-paper transition-colors hover:bg-stamp"
          >
            <span className="font-mono text-[11px] font-medium tracking-[0.09em] uppercase">{t('closePreview')}</span>
            <span className="tabular font-mono text-[13px] font-medium">
              {formatDenar(receiptData.total)}
              <span className="ml-1.5 text-[10px] tracking-[0.09em] opacity-70">ДЕН</span>
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
