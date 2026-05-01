import { flagSourceAsOutdated } from "../../firebase/firestore";
import type { TrustMetadata } from "../../types";

interface TrustPanelProps {
  sessionId: string;
  trust: TrustMetadata | undefined;
}

const fallbackTrust: TrustMetadata = {
  confidence: 0.82,
  lastVerified: "2026-04-30",
  rationale: "This answer uses Electra's civic workflow model and should be checked against your local election office for final deadlines.",
  sources: [
    {
      id: "usa-gov-voting",
      title: "Voting and elections",
      publisher: "USAGov",
      url: "https://www.usa.gov/voting",
      lastVerified: "2026-04-30"
    }
  ]
};

export const TrustPanel = ({ sessionId, trust = fallbackTrust }: TrustPanelProps) => {
  const handleFlag = async (sourceId: string) => {
    await flagSourceAsOutdated({
      sessionId,
      sourceId,
      reason: "User flagged source as outdated"
    });
  };

  return (
    <details className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <summary className="cursor-pointer font-semibold text-[var(--ink)]">
        How do we know this?
      </summary>
      <div className="mt-4 space-y-3">
        <p className="text-sm text-[var(--ink-secondary)]">{trust.rationale}</p>
        <p className="text-sm font-semibold text-[var(--ink)]">
          Confidence: {Math.round(trust.confidence * 100)}% | Last verified {trust.lastVerified}
        </p>
        {trust.sources.map((source) => (
          <article
            key={source.id}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-3"
          >
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--accent)] underline"
            >
              {source.title}
            </a>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              {source.publisher} | verified {source.lastVerified}
            </p>
            <button
              type="button"
              onClick={() => void handleFlag(source.id)}
              className="mt-3 min-h-10 rounded-full border border-[var(--border)] px-3 text-sm font-semibold"
            >
              Flag as outdated
            </button>
          </article>
        ))}
      </div>
    </details>
  );
};
