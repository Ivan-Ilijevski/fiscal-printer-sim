'use client';

import { useTranslations } from 'next-intl';

/** Rungs the −/+ buttons step through. Fit and Fill set off-ladder values. */
export const ZOOM_LADDER = [0.5, 0.75, 1, 1.5, 2, 3];
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;

/** Next rung strictly above/below the current value, so −/+ work from a Fit/Fill number too. */
export function stepZoom(current: number, direction: 1 | -1): number {
  const next =
    direction === 1
      ? ZOOM_LADDER.find((z) => z > current + 0.001)
      : [...ZOOM_LADDER].reverse().find((z) => z < current - 0.001);
  return next ?? current;
}

export type ZoomMode = 'fit' | 'fill' | 'manual';

interface ZoomControlsProps {
  zoom: number;
  mode: ZoomMode;
  onStep: (direction: 1 | -1) => void;
  onReset: () => void;
  onFit: () => void;
  onFill: () => void;
}

function ControlButton({
  children,
  onClick,
  disabled,
  label,
  active,
  wide,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  active?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`h-8 font-mono text-[11px] font-medium tracking-[0.09em] transition-colors disabled:opacity-30 ${
        wide ? 'px-2.5' : 'w-8'
      } ${active ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-3 hover:text-ink disabled:hover:bg-transparent'}`}
    >
      {children}
    </button>
  );
}

export default function ZoomControls({ zoom, mode, onStep, onReset, onFit, onFill }: ZoomControlsProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center border border-rule bg-paper-2">
        <ControlButton onClick={() => onStep(-1)} disabled={zoom <= MIN_ZOOM + 0.001} label={t('zoomOut')}>
          −
        </ControlButton>
        <button
          type="button"
          onClick={onReset}
          aria-label={t('resetZoom')}
          title={t('resetZoom')}
          className="tabular h-8 border-x border-rule px-2 font-mono text-[11px] font-medium text-ink transition-colors hover:bg-paper-3"
        >
          {Math.round(zoom * 100)}%
        </button>
        <ControlButton onClick={() => onStep(1)} disabled={zoom >= MAX_ZOOM - 0.001} label={t('zoomIn')}>
          +
        </ControlButton>
      </div>

      <div className="flex items-center border border-rule bg-paper-2">
        <ControlButton onClick={onFit} label={t('zoomFit')} active={mode === 'fit'} wide>
          {t('zoomFit')}
        </ControlButton>
        <span className="h-8 w-px bg-rule" aria-hidden="true" />
        <ControlButton onClick={onFill} label={t('zoomFill')} active={mode === 'fill'} wide>
          {t('zoomFill')}
        </ControlButton>
      </div>
    </div>
  );
}
