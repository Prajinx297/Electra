import type { ReactNode } from 'react';

import { logger } from '@/lib/logger';

import { flagSourceAsOutdated } from '../../firebase/firestore';
import type { CivicSource, TrustMetadata } from '../../types';

/** Summary affordance copy anchoring civic transparency disclosures. */
const TRUST_PANEL_SUMMARY_LABEL = 'How do we know this?';

/** Analytics-safe rationale persisted when learners flag outdated civic references. */
const TRUST_PANEL_OUTDATED_REASON = 'User flagged source as outdated';

/** Fallback trust bundle guaranteeing learners always see transparency scaffolding. */
const TRUST_PANEL_FALLBACK_METADATA: TrustMetadata = {
  confidence: 0.82,
  lastVerified: '2026-04-30',
  rationale:
    "This answer uses Electra's civic workflow model and should be checked against your District Election Office for final deadlines.",
  sources: [
    {
      id: 'eci-gov-voting',
      lastVerified: '2026-04-30',
      publisher: 'ECI',
      title: 'Voting and elections',
      url: 'https://www.eci.gov.in',
    },
  ],
};

/**
 * Props for {@link TrustPanel}.
 */
export interface TrustPanelProps {
  /** Session identifier correlating flagged civic references with Firestore review queues. */
  sessionId: string;
  /** Structured trust metadata emitted by Oracle responses or pedagogical fallbacks. */
  trust?: TrustMetadata | undefined;
}

/**
 * Props for {@link TrustSourceArticle}.
 */
interface TrustSourceArticleProps {
  /** Firebase session identifier propagated into audit queues. */
  sessionId: string;
  /** Individual civic reference surfaced inside Oracle transparency payloads. */
  source: CivicSource;
}

/**
 * Renders an individual civic reference plus outdated-flag instrumentation.
 *
 * @param props - Session correlation plus structured civic citation metadata.
 * @returns Article-level disclosure describing publishers and verification timestamps.
 */
function TrustSourceArticle({ sessionId, source }: TrustSourceArticleProps): ReactNode {
  const handleFlagClick = (): void => {
    void flagSourceAsOutdated({
      reason: TRUST_PANEL_OUTDATED_REASON,
      sessionId,
      sourceId: source.id,
    }).catch((error: unknown): void => {
      logger.error('TrustPanel failed to enqueue outdated-source flag', error);
    });
  };

  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3">
      <a
        className="font-semibold text-[var(--accent)] underline"
        href={source.url}
        rel="noreferrer"
        target="_blank"
      >
        {source.title}
      </a>
      <p className="mt-1 text-sm text-[var(--ink-secondary)]">
        {source.publisher} | verified {source.lastVerified}
      </p>
      <button
        type="button"
        className="mt-3 min-h-10 rounded-full border border-[var(--border)] px-3 text-sm font-semibold"
        onClick={handleFlagClick}
      >
        Flag as outdated
      </button>
    </article>
  );
}

/**
 * Collapsible transparency rail summarizing civic citations backing Oracle outputs.
 *
 * @param props - Session correlation plus optional structured trust metadata.
 * @returns Disclosure panel pairing rationale copy with actionable citation hygiene controls.
 */
export function TrustPanel({
  sessionId,
  trust = TRUST_PANEL_FALLBACK_METADATA,
}: TrustPanelProps): ReactNode {
  const confidencePercent = Math.round(trust.confidence * 100);

  return (
    <details className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <summary className="cursor-pointer font-semibold text-[var(--ink)]">{TRUST_PANEL_SUMMARY_LABEL}</summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-[var(--ink-secondary)]">{trust.rationale}</p>
        <p className="text-sm font-semibold text-[var(--ink)]">
          Confidence: {confidencePercent}% | Last verified {trust.lastVerified}
        </p>
        {trust.sources.map((source: CivicSource): ReactNode => (
          <TrustSourceArticle key={source.id} sessionId={sessionId} source={source} />
        ))}
      </div>
    </details>
  );
}
