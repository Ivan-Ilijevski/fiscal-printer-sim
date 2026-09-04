'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ReceiptData, ReceiptItem } from '@/types/receipt';
import { CustomPreset, ReceiptPreset } from '@/lib/receipt-presets';
import { downloadReceiptJson, parseReceiptFile } from '@/lib/receipt-file';
import { clampNumeric, numericFieldBounds } from '@/lib/receipt-schema';
import { calculateVAT, formatDenar, sumItems, VatType } from '@/utils/VATCalc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Section, { FieldGrid } from '@/components/form/Section';
import Field from '@/components/form/Field';
import { CheckField, NumberField, Option, SelectField, SliderField, TextField } from '@/components/form/Controls';

interface ReceiptFormProps {
  initialData: ReceiptData;
  onDataChange: (data: ReceiptData) => void;
  builtInPresets: ReceiptPreset[];
  customPresets: CustomPreset[];
  selectedPresetId?: string;
  onPresetSelect: (presetId: string) => void;
  onSavePreset: (
    name: string,
    data: ReceiptData
  ) => { status: 'empty' } | { status: 'storage' } | { status: 'saved' | 'overwritten'; presetId: string };
  onDeletePreset: (presetId: string) => void;
  onImportReceipt: (data: ReceiptData) => void;
}

export default function ReceiptForm({
  initialData,
  onDataChange,
  builtInPresets,
  customPresets,
  selectedPresetId,
  onPresetSelect,
  onSavePreset,
  onDeletePreset,
  onImportReceipt,
}: ReceiptFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [presetName, setPresetName] = useState('');
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations();

  const fontOptions: Option[] = [
    { value: 'Courier New', label: 'Courier New', fontFamily: 'Courier New, monospace' },
    { value: 'monospace', label: 'Monospace', fontFamily: 'monospace' },
    { value: 'Arial', label: 'Arial', fontFamily: 'Arial, sans-serif' },
    { value: 'Arial Narrow', label: 'Arial Narrow', fontFamily: 'Arial Narrow, sans-serif' },
    { value: 'Times New Roman', label: 'Times New Roman', fontFamily: 'Times New Roman, serif' },
    { value: 'Consolas', label: 'Consolas', fontFamily: 'Consolas, monospace' },
    { value: 'Monaco', label: 'Monaco', fontFamily: 'Monaco, monospace' },
    { value: 'Lucida Console', label: 'Lucida Console', fontFamily: 'Lucida Console, monospace' },
    { value: 'Impact', label: 'Impact', fontFamily: 'Impact, sans-serif' },
    { value: 'Arial Black', label: 'Arial Black', fontFamily: 'Arial Black, sans-serif' },
    { value: 'Trebuchet MS', label: 'Trebuchet MS', fontFamily: 'Trebuchet MS, sans-serif' },
    { value: 'Verdana', label: 'Verdana', fontFamily: 'Verdana, sans-serif' },
    { value: 'Tahoma', label: 'Tahoma', fontFamily: 'Tahoma, sans-serif' },
    { value: 'PixelFont', label: 'PixelFont (Custom)', fontFamily: 'PixelFont, monospace' },
    { value: 'PixelFontWide', label: 'PixelFontWide (Custom)', fontFamily: 'PixelFontWide, monospace' },
  ];

  const updateFormData = (updates: Partial<ReceiptData>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    onDataChange(newData);
  };

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const selectedCustomPreset = customPresets.find((preset) => preset.id === selectedPresetId);

  const updateStoreInfo = (field: string, value: string) => {
    const bounds = numericFieldBounds[field];
    if (!bounds) {
      updateFormData({ [field]: value });
      return;
    }

    const current = formData[field as keyof ReceiptData];
    const fallback = typeof current === 'number' ? current : bounds.min;
    updateFormData({ [field]: clampNumeric(value, { ...bounds, fallback }) });
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number | boolean) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };

    if (field === 'name') {
      item.name = value as string;
    } else if (field === 'quantity') {
      item.quantity = clampNumeric(value as string | number, { min: 1, max: 1_000_000, fallback: 1 });
    } else if (field === 'price') {
      item.price = clampNumeric(value as string | number, { min: 0, max: 100_000_000, fallback: 0 });
    } else if (field === 'vatType') {
      item.vatType = value as VatType;
    } else if (field === 'isDomestic') {
      item.isDomestic = value as boolean;
    }

    newItems[index] = item;

    updateFormData({
      items: newItems,
      total: sumItems(newItems),
    });
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      name: 'New Item',
      quantity: 1,
      price: 0.0,
      vatType: 'A',
      isDomestic: false,
    };

    const newItems = [...formData.items, newItem];

    updateFormData({
      items: newItems,
      total: sumItems(newItems),
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);

    updateFormData({
      items: newItems,
      total: sumItems(newItems),
    });
  };

  const paymentMethodOptions: Option[] = [
    { value: 'НА КРЕДИТ', label: t('paymentMethods.creditCard') },
    { value: 'ВО ГОТОВО', label: t('paymentMethods.cash') },
    { value: 'Debit Card', label: t('paymentMethods.debitCard') },
    { value: 'Mobile Payment', label: t('paymentMethods.mobilePayment') },
  ];

  const vatOptions: Option[] = [
    { value: 'A', label: t('vatShortA') },
    { value: 'B', label: t('vatShortB') },
    { value: 'V', label: t('vatShortV') },
    { value: 'G', label: t('vatShortG') },
  ];

  const handlePresetSave = () => {
    const result = onSavePreset(presetName, formData);

    if (result.status === 'empty') {
      setPresetFeedback(t('presetValidationEmptyName'));
      return;
    }

    if (result.status === 'storage') {
      setPresetFeedback(t('presetSaveFailed'));
      return;
    }

    setPresetFeedback(result.status === 'overwritten' ? t('presetOverwriteSuccess') : t('presetSaveSuccess'));
    setPresetName('');
  };

  const handlePresetDelete = () => {
    if (!selectedCustomPreset) {
      return;
    }

    onDeletePreset(selectedCustomPreset.id);
    setPresetFeedback(t('presetDeleteSuccess'));
  };

  const handleExport = () => {
    downloadReceiptJson(formData);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so re-selecting the same file still fires `change`, regardless of
    // which branch below returns.
    event.target.value = '';

    if (!file) {
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setPresetFeedback(t('importReadFailed'));
      return;
    }

    const result = parseReceiptFile(text);

    if (result.status === 'invalid-json') {
      setPresetFeedback(t('importInvalidJson'));
      return;
    }

    if (result.status === 'invalid-shape') {
      setPresetFeedback(t('importInvalidShape'));
      return;
    }

    setFormData(result.data);
    onImportReceipt(result.data);
    setPresetFeedback(
      result.filledFields.length === 0
        ? t('importSuccess')
        : t('importSuccessWithDefaults', { count: result.filledFields.length })
    );
  };

  // VAT bands, with the amount actually contained in the промет for each — not the rate.
  const vatBands: { type: VatType; label: string; rate: number }[] = [
    { type: 'A', label: t('vatShortA'), rate: formData.vatTypeA },
    { type: 'B', label: t('vatShortB'), rate: formData.vatTypeB },
    { type: 'V', label: t('vatShortV'), rate: formData.vatTypeV },
    { type: 'G', label: t('vatShortG'), rate: formData.vatTypeG },
  ];

  return (
    <div className="space-y-10">
      {/* 01 — Presets */}
      <Section index="01" title={t('presets')} delay={0}>
        <div className="space-y-4">
          <Field id="preset-selector" label={t('presetSelectorLabel')}>
            <Select value={selectedPresetId} onValueChange={onPresetSelect}>
              <SelectTrigger id="preset-selector">
                <SelectValue placeholder={t('presetSelectorPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t('builtInPresets')}</SelectLabel>
                  {builtInPresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>{t('customPresets')}</SelectLabel>
                  {customPresets.length > 0 ? (
                    customPresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-2 font-mono text-[11px] text-ink-3">{t('noCustomPresets')}</div>
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Field id="preset-name" label={t('presetNameLabel')}>
              <Input
                id="preset-name"
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t('presetNamePlaceholder')}
              />
            </Field>

            <Button type="button" onClick={handlePresetSave} variant="outline">
              {t('savePreset')}
            </Button>

            <Button type="button" onClick={handlePresetDelete} disabled={!selectedCustomPreset} variant="destructive">
              {t('deletePreset')}
            </Button>
          </div>

          {/* Scoped to the current receipt only — the custom preset library is a separate
              concern that lives in localStorage, not in this file. */}
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={handleExport} variant="outline">
              {t('exportJson')}
            </Button>

            <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline">
              {t('importJson')}
            </Button>

            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImportFile}
            />
          </div>

          {presetFeedback ? (
            <p className="border-l-2 border-seal bg-paper-2 px-3 py-2 font-mono text-[11px] text-ink-2">
              {presetFeedback}
            </p>
          ) : null}
        </div>
      </Section>

      {/* 02 — Identity */}
      <Section index="02" title={t('identity')} delay={60}>
        <FieldGrid>
          <TextField
            id="receiptType"
            label={t('receiptTypeLabel')}
            value={formData.receiptType}
            placeholder={t('receiptTypePlaceholder')}
            onChange={(v) => updateStoreInfo('receiptType', v)}
            className="sm:col-span-2"
          />
          <TextField
            id="storeName"
            label={t('storeName')}
            value={formData.storeName}
            onChange={(v) => updateStoreInfo('storeName', v)}
            className="sm:col-span-2"
          />
          <TextField
            id="address"
            label={t('address')}
            value={formData.address}
            onChange={(v) => updateStoreInfo('address', v)}
            className="sm:col-span-2"
          />
          <TextField
            id="taxNumber"
            label={t('taxNumber')}
            value={formData.taxNumber}
            onChange={(v) => updateStoreInfo('taxNumber', v)}
          />
          <TextField
            id="vatNumber"
            label={t('vatNumber')}
            value={formData.vatNumber}
            onChange={(v) => updateStoreInfo('vatNumber', v)}
          />
          <TextField
            id="receiptNumber"
            label={t('receiptNumber')}
            value={formData.receiptNumber}
            onChange={(v) => updateStoreInfo('receiptNumber', v)}
          />
          <SelectField
            id="paymentMethod"
            label={t('paymentMethod')}
            value={formData.paymentMethod}
            onChange={(v) => updateStoreInfo('paymentMethod', v)}
            options={paymentMethodOptions}
          />
        </FieldGrid>
      </Section>

      {/* 03 — Document */}
      <Section index="03" title={t('document')} delay={120}>
        <FieldGrid className="sm:grid-cols-3">
          <TextField id="date" label={t('date')} value={formData.date} onChange={(v) => updateStoreInfo('date', v)} />
          <TextField
            id="time"
            label={t('time')}
            value={formData.time}
            placeholder="HH:MM:SS"
            onChange={(v) => updateStoreInfo('time', v)}
          />
          <CheckField
            id="dateTextFlag"
            label={t('showDateLabel')}
            checked={formData.dateTextFlag}
            onChange={(checked) => updateFormData({ dateTextFlag: checked })}
            description={formData.dateTextFlag ? t('on') : t('off')}
          />
        </FieldGrid>
      </Section>

      {/* 04 — Items */}
      <Section
        index="04"
        title={t('items')}
        delay={180}
        action={
          <Button onClick={addItem} size="sm" variant="outline">
            + {t('addItem')}
          </Button>
        }
      >
        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="border border-rule bg-sheet">
              <div className="flex items-center justify-between border-b border-rule bg-paper-2 px-4 py-2">
                <span className="label-mono">
                  {t('item')} {String(index + 1).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-3">
                  <span className="tabular font-mono text-[12px] font-medium text-ink">
                    {formatDenar(item.price * item.quantity)}
                  </span>
                  {formData.items.length > 1 && (
                    <Button onClick={() => removeItem(index)} variant="destructive" size="sm">
                      {t('remove')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4 p-4">
                <Field id={`itemName-${index}`} label={t('itemName')}>
                  <textarea
                    id={`itemName-${index}`}
                    placeholder={t('itemName')}
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    rows={2}
                    className="field-well w-full resize-y px-3 py-2 font-mono text-[13px] outline-none placeholder:text-ink-3/70"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                  <NumberField
                    id={`quantity-${index}`}
                    label={t('quantity')}
                    min={1}
                    value={item.quantity.toString()}
                    onChange={(v) => updateItem(index, 'quantity', v)}
                  />
                  <NumberField
                    id={`unitPrice-${index}`}
                    label={t('unitPrice')}
                    min={0}
                    step="0.01"
                    value={item.price.toString()}
                    onChange={(v) => updateItem(index, 'price', v)}
                  />
                  <SelectField
                    id={`vatType-${index}`}
                    label={t('vatType')}
                    value={item.vatType}
                    onChange={(v) => updateItem(index, 'vatType', v)}
                    options={vatOptions}
                  />
                  <CheckField
                    id={`isDomestic-${index}`}
                    label={t('domesticProduct')}
                    checked={item.isDomestic}
                    onChange={(checked) => updateItem(index, 'isDomestic', checked)}
                    description={t('domestic')}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 05 — Summary */}
      <Section index="05" title={t('summary')} delay={240}>
        <div className="border border-rule-2 bg-sheet">
          <div className="divide-y divide-rule">
            {vatBands.map((band) => (
              <div key={band.type} className="flex items-baseline justify-between px-4 py-2.5">
                <span className="label-mono">
                  {t('vatType')} {band.label}
                </span>
                <span className="tabular font-mono text-[13px] text-ink-2">
                  {formatDenar(calculateVAT(formData, band.type))}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-baseline justify-between border-t-2 border-ink px-4 py-4">
            <span className="label-mono text-ink">{t('total')}</span>
            <span className="tabular font-display text-3xl font-semibold tracking-tight text-ink">
              {formatDenar(formData.total)}
              <span className="ml-2 font-mono text-[11px] font-medium tracking-[0.09em] text-ink-3">ДЕН</span>
            </span>
          </div>
        </div>
      </Section>

      {/* 06 — Rendering (advanced) */}
      <Section index="06" title={t('rendering')} collapsible delay={300}>
        <FieldGrid>
          <TextField
            id="datamatrixCode"
            label={t('datamatrixCode')}
            value={formData.datamatrixCode}
            placeholder={t('datamatrixCodePlaceholder')}
            onChange={(v) => updateStoreInfo('datamatrixCode', v)}
            className="sm:col-span-2"
          />
          <SliderField
            id="datamatrixSize"
            label={t('datamatrixSize')}
            min={50}
            max={300}
            step={10}
            unit="px"
            value={formData.datamatrixSize}
            onChange={(v) => updateStoreInfo('datamatrixSize', v)}
          />
          <SliderField
            id="fiscalLogoSize"
            label={t('fiscalLogoSize')}
            min={50}
            max={384}
            step={10}
            unit="px"
            value={formData.fiscalLogoSize}
            onChange={(v) => updateStoreInfo('fiscalLogoSize', v)}
          />
        </FieldGrid>
      </Section>

      {/* 07 — Typography (advanced) */}
      <Section index="07" title={t('typography')} collapsible delay={340}>
        <FieldGrid>
          <SelectField
            id="headerFontFamily"
            label={t('headerFontFamily')}
            value={formData.headerFontFamily}
            onChange={(v) => updateStoreInfo('headerFontFamily', v)}
            options={fontOptions}
          />
          <SelectField
            id="bodyFontFamily"
            label={t('bodyFontFamily')}
            value={formData.bodyFontFamily}
            onChange={(v) => updateStoreInfo('bodyFontFamily', v)}
            options={fontOptions}
          />
          <SliderField
            id="headerFontSize"
            label={t('headerFontSize')}
            min={10}
            max={50}
            unit="px"
            value={formData.headerFontSize}
            onChange={(v) => updateStoreInfo('headerFontSize', v)}
          />
          <SliderField
            id="headerFontSpacing"
            label={t('headerFontSpacing')}
            min={5}
            max={50}
            unit="px"
            value={formData.headerFontSpacing}
            onChange={(v) => updateStoreInfo('headerFontSpacing', v)}
          />
          <SliderField
            id="bodyFontSize"
            label={t('bodyFontSize')}
            min={10}
            max={50}
            unit="px"
            value={formData.bodyFontSize}
            onChange={(v) => updateStoreInfo('bodyFontSize', v)}
          />
          <SliderField
            id="bodyFontSpacing"
            label={t('bodyFontSpacing')}
            min={5}
            max={50}
            unit="px"
            value={formData.bodyFontSpacing}
            onChange={(v) => updateStoreInfo('bodyFontSpacing', v)}
          />
          <CheckField
            id="headerFontDoubleWidth"
            label={t('headerDoubleWidth')}
            checked={formData.headerFontDoubleWidth}
            onChange={(checked) => updateFormData({ headerFontDoubleWidth: checked })}
            description={t('headerDoubleWidthHint')}
          />
        </FieldGrid>
      </Section>
    </div>
  );
}
