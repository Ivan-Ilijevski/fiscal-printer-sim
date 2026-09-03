'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import PreviewPanel from '@/components/PreviewPanel';
import ReceiptForm from '@/components/ReceiptForm';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuthSession } from '@/components/auth/SessionProvider';
import SignOutButton from '@/components/auth/SignOutButton';
import { ReceiptData } from '@/types/receipt';
import { formatDenar } from '@/utils/VATCalc';
import {
  builtInPresets,
  currentDateTime,
  CustomPreset,
  defaultReceiptData,
  loadCustomPresets,
  saveCustomPresets,
} from '@/lib/receipt-presets';

export default function Home() {
  const [receiptData, setReceiptData] = useState(defaultReceiptData);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const t = useTranslations();
  const { user } = useAuthSession();
  const displayName = user.name ?? user.email;

  useEffect(() => {
    setCustomPresets(loadCustomPresets());
    // Stamped after mount rather than at module load: a module-level `new Date()` is evaluated
    // once per process, so it goes stale on a long-running server and differs between the
    // server and client renders.
    setReceiptData((current) => ({ ...current, ...currentDateTime() }));
  }, []);

  const handlePresetSelect = (presetId: string) => {
    const preset = [...builtInPresets, ...customPresets].find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }

    setSelectedPresetId(preset.id);
    setReceiptData(preset.data);
  };

  const handleSavePreset = (name: string, data: ReceiptData) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { status: 'empty' as const };
    }

    const existingPreset = customPresets.find((preset) => preset.name === trimmedName);
    const nextPreset: CustomPreset = existingPreset
      ? {
          ...existingPreset,
          data,
        }
      : {
          id: `custom:${Date.now()}`,
          name: trimmedName,
          data,
          createdAt: new Date().toISOString(),
        };

    const nextCustomPresets = existingPreset
      ? customPresets.map((preset) => (preset.id === existingPreset.id ? nextPreset : preset))
      : [...customPresets, nextPreset];

    if (!saveCustomPresets(nextCustomPresets)) {
      return { status: 'storage' as const };
    }

    setCustomPresets(nextCustomPresets);
    setSelectedPresetId(nextPreset.id);

    return { status: existingPreset ? ('overwritten' as const) : ('saved' as const), presetId: nextPreset.id };
  };

  const handleDeletePreset = (presetId: string) => {
    const nextCustomPresets = customPresets.filter((preset) => preset.id !== presetId);
    saveCustomPresets(nextCustomPresets);
    setCustomPresets(nextCustomPresets);

    if (selectedPresetId === presetId) {
      setSelectedPresetId(undefined);
    }
  };

  return (
    <div className="min-h-screen-safe relative z-[2]">
      <div className="mx-auto max-w-[1500px] px-5 pt-8 pb-28 sm:px-8 xl:pb-12">
        <header className="rise mb-12 border-b-2 border-ink pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-[clamp(1.9rem,4vw,2.85rem)] leading-[1.05] font-bold tracking-[-0.02em] text-ink">
                {t('title')}
              </h1>
              <p className="label-mono mt-2.5">{t('specLine')}</p>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="min-w-0">
                <p className="truncate font-mono text-[12px] text-ink">{displayName}</p>
                <p className="truncate font-mono text-[11px] text-ink-3">{user.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <LanguageSwitcher />
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] xl:gap-16">
          {/* Editor — the only thing in flow on mobile */}
          <div className="min-w-0">
            <div className="rise mb-9">
              <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{t('customizeReceipt')}</h2>
              <p className="mt-1.5 font-mono text-[12px] text-ink-3">{t('configureSubtitle')}</p>
            </div>

            <ReceiptForm
              initialData={receiptData}
              onDataChange={setReceiptData}
              builtInPresets={builtInPresets}
              customPresets={customPresets}
              selectedPresetId={selectedPresetId}
              onPresetSelect={handlePresetSelect}
              onSavePreset={handleSavePreset}
              onDeletePreset={handleDeletePreset}
            />
          </div>

          {/* Receipt — sticky right column at xl+, a slide-up sheet below it */}
          <div className="xl:sticky xl:top-8 xl:self-start">
            <PreviewPanel receiptData={receiptData} open={previewOpen} onClose={() => setPreviewOpen(false)} />
          </div>
        </div>
      </div>

      {/* Mobile action bar. Doubles as a running total so the amount stays visible while editing.
          position:fixed escapes the body safe-area padding, so .pb-safe re-applies the inset. */}
      <div
        className={`pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/95 px-5 pt-3 backdrop-blur-sm transition-opacity xl:hidden ${
          previewOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex h-12 w-full items-center justify-between bg-ink px-4 text-paper transition-colors hover:bg-stamp"
        >
          <span className="font-mono text-[11px] font-medium tracking-[0.09em] uppercase">{t('previewReceipt')}</span>
          <span className="tabular font-mono text-[13px] font-medium">
            {formatDenar(receiptData.total)}
            <span className="ml-1.5 text-[10px] tracking-[0.09em] opacity-70">ДЕН</span>
          </span>
        </button>
      </div>
    </div>
  );
}
