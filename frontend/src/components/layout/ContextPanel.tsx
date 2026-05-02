import { getCopy } from '../../i18n';
import type { LanguageCode } from '../../types';
import { ConfidenceIndicator } from '../shared/ConfidenceIndicator';

interface ContextPanelProps {
  language: LanguageCode;
  summary: string;
  warning: string | null;
  confidence: number;
  predictionHit: boolean;
}

export const ContextPanel = ({
  language,
  summary,
  warning,
  confidence,
  predictionHit,
}: ContextPanelProps) => (
  <aside className="hidden w-[240px] shrink-0 xl:block">
    <div className="sticky top-6 space-y-4">
      <section className="rounded-[24px] bg-[var(--surface)] p-5 shadow-[0_8px_24px_var(--shadow)]">
        <h2 className="text-base font-bold text-[var(--ink)]">
          {getCopy(language, 'whatThisMeans')}
        </h2>
        <p className="mt-2 text-[var(--ink-secondary)]">{summary}</p>
      </section>
      {warning ? (
        <section className="rounded-[24px] bg-[var(--civic-amber-light)] p-5 text-[var(--ink)] shadow-[0_8px_24px_var(--shadow)]">
          {warning}
        </section>
      ) : null}
      <ConfidenceIndicator confidence={confidence} />
      {predictionHit ? (
        <section className="rounded-[24px] bg-[var(--civic-green-light)] p-5 text-[var(--ink)] shadow-[0_8px_24px_var(--shadow)]">
          Loaded instantly. Oracle predicted this.
        </section>
      ) : null}
    </div>
  </aside>
);
