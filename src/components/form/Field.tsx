import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + optional hint. Every form control in the app goes through this. */
export default function Field({ id, label, hint, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="font-mono text-[11px] leading-snug text-ink-3">{hint}</p> : null}
    </div>
  );
}
