'use client';

const steps = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Review' },
  { n: 3, label: 'Done' },
] as const;

export function ImportWizardStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Import steps" className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((s) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex items-center gap-2">
            {s.n > 1 ? <span className="text-um-text/50" aria-hidden>→</span> : null}
            <span
              className={
                active
                  ? 'font-semibold text-black border border-um-border px-2 py-0.5 bg-white'
                  : done
                    ? 'text-um-text'
                    : 'text-um-text/60'
              }
            >
              {s.n}. {s.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
