'use client';

import Field from '@/components/form/Field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/* Text ------------------------------------------------------------------- */

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
}

export function TextField({ id, label, value, onChange, placeholder, hint, className }: TextFieldProps) {
  return (
    <Field id={id} label={label} hint={hint} className={className}>
      <Input id={id} type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/* Number ----------------------------------------------------------------- */

interface NumberFieldProps {
  id: string;
  label: string;
  value: number | string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number | string;
  readOnly?: boolean;
  className?: string;
}

export function NumberField({ id, label, value, onChange, min, max, step, readOnly, className }: NumberFieldProps) {
  return (
    <Field id={id} label={label} className={className}>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tabular"
      />
    </Field>
  );
}

/* Slider ----------------------------------------------------------------- */

interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  className?: string;
}

/**
 * Replaces six near-identical range+number blocks. The number input is kept because the
 * range alone can't be typed into, and the caller clamps both through the same handler.
 */
export function SliderField({ id, label, value, onChange, min, max, step = 1, unit, className }: SliderFieldProps) {
  return (
    <Field id={id} label={label} className={className}>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1"
        />
        <div className="flex h-10 w-[4.25rem] shrink-0 items-center justify-end gap-1 border border-rule bg-paper-2 px-2">
          <input
            type="number"
            aria-label={label}
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="tabular w-full bg-transparent text-right font-mono text-[13px] text-ink outline-none"
          />
          {unit ? <span className="label-mono shrink-0">{unit}</span> : null}
        </div>
      </div>
    </Field>
  );
}

/* Select ----------------------------------------------------------------- */

export interface Option {
  value: string;
  label: string;
  /** Applied to the option row, so font pickers preview their own face. */
  fontFamily?: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export function SelectField({ id, label, value, onChange, options, placeholder, className }: SelectFieldProps) {
  return (
    <Field id={id} label={label} className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              style={option.fontFamily ? { fontFamily: option.fontFamily } : undefined}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/* Checkbox --------------------------------------------------------------- */

interface CheckFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  className?: string;
}

export function CheckField({ id, label, checked, onChange, description, className }: CheckFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <span className="label-mono block">{label}</span>
      <label
        htmlFor={id}
        className="flex h-10 cursor-pointer items-center gap-2.5 border border-rule bg-paper-2 px-3 transition-colors hover:bg-sheet"
      >
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="font-mono text-[12px] text-ink-2">{description ?? (checked ? 'On' : 'Off')}</span>
      </label>
    </div>
  );
}
