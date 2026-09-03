import { cn } from '@/lib/utils';

interface SectionProps {
  /** Two-digit index rendered as the spec-sheet section number, e.g. "03". */
  index: string;
  title: string;
  /** Renders a native <details> instead of a plain block. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Right-hand slot in the header rule, e.g. the "Add item" button. */
  action?: React.ReactNode;
  /** Staggers the page-load reveal. */
  delay?: number;
  children: React.ReactNode;
}

/*
 * The repeating unit of the whole form: a numbered heading with a hairline rule running out
 * to the right edge. Advanced groups collapse via a native <details>, which is keyboard-
 * accessible and needs no extra dependency.
 */
function Heading({ index, title, action }: Pick<SectionProps, 'index' | 'title' | 'action'>) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-stamp tabular">{index}</span>
      <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
      <span className="h-px flex-1 translate-y-[-3px] bg-rule" aria-hidden="true" />
      {action}
    </div>
  );
}

export default function Section({
  index,
  title,
  collapsible = false,
  defaultOpen = false,
  action,
  delay = 0,
  children,
}: SectionProps) {
  const style = { animationDelay: `${delay}ms` };

  if (collapsible) {
    return (
      <details open={defaultOpen} className="rise group" style={style}>
        <summary className="flex cursor-pointer list-none items-baseline gap-3 [&::-webkit-details-marker]:hidden">
          <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-stamp tabular">{index}</span>
          <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
          <span className="h-px flex-1 translate-y-[-3px] bg-rule" aria-hidden="true" />
          <span className="label-mono transition-colors group-hover:text-ink">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>
        <div className="pt-5">{children}</div>
      </details>
    );
  }

  return (
    <section className="rise" style={style}>
      <Heading index={index} title={title} action={action} />
      <div className="pt-5">{children}</div>
    </section>
  );
}

/** Two-column grid used inside most sections. */
export function FieldGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2', className)}>{children}</div>;
}
