'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import ReceiptRenderer from '@/components/ReceiptRenderer';
import { ReceiptData } from '@/types/receipt';

const RULER_TICKS = [0, 96, 192, 288, 384];

/** The app's core constraint — 384px — turned into ornament. */
function Ruler() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="flex items-end justify-between border-b border-rule-2 pb-1">
        {RULER_TICKS.map((tick, i) => (
          <div key={tick} className="flex flex-col items-center gap-1" style={{ alignItems: i === 0 ? 'flex-start' : i === RULER_TICKS.length - 1 ? 'flex-end' : 'center' }}>
            <span className="label-mono leading-none tabular">{tick}</span>
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        <div className="flex items-baseline justify-between border-b border-rule px-5 py-4 xl:border-0 xl:px-0 xl:pt-0">
          {/* No spec line here — the page header already carries it, and the ruler below
              states the width far more directly. */}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-8 native-scroll xl:overflow-visible xl:px-0 xl:pt-6 xl:pb-0">
          <div className="mx-auto w-full max-w-[420px] xl:mx-0">
            <Ruler />

            {/* ReceiptRenderer owns the paper and the actions below it. */}
            <div className="mt-4">
              <ReceiptRenderer receiptData={receiptData} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
