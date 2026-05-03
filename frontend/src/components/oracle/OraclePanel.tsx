import { useState, type ChangeEvent, type ReactNode } from 'react';

import { logger } from '@/lib/logger';

import { StreamingOraclePanel } from '../../features/streaming/StreamingOraclePanel';
import { TrustPanel } from '../../features/trust/TrustPanel';
import type { CognitiveLevel, LanguageCode, OracleRequest, OracleResponse } from '../../types';
import { CognitiveLevelToggle } from '../shared/CognitiveLevelToggle';
import { ProactiveWarning } from '../shared/ProactiveWarning';

import { OracleMessage } from './OracleMessage';

/** Prompt sent when the learner invokes the stuck-path simplification affordance. */
const STUCK_SIMPLIFY_USER_PROMPT =
  'I am stuck. Please make this simpler and tell me only the next action.';

/** Minimum textarea height utility class for the Oracle question composer. */
const ORACLE_QUESTION_TEXTAREA_MIN_HEIGHT_CLASS = 'min-h-[112px]';

/** Placeholder copy for the free-form Oracle question field. */
const ORACLE_QUESTION_PLACEHOLDER = 'Ask a question';

/**
 * Props for {@link OraclePanelStreamingSection}.
 */
interface OraclePanelStreamingSectionProps {
  /** When set, streaming UI replaces the static Oracle transcript. */
  streamRequest: OracleRequest | null | undefined;
  /** Gemini stream continuation token when resuming chunked responses. */
  streamToken: string | null | undefined;
  /** Telemetry correlation identifier for trust + streaming analytics. */
  sessionId: string;
  /** True while a non-streaming Oracle round-trip is in flight. */
  busy: boolean | undefined;
  /** Latest completed Oracle payload rendered when idle. */
  response: OracleResponse;
  /** Whether the stuck intervention banner should surface. */
  stuckInterventionVisible: boolean;
  /** Primary ask handler invoked for compose + stuck flows. */
  onAsk: (message: string) => Promise<void>;
  /** Streaming lifecycle hooks surfaced by {@link StreamingOraclePanel}. */
  onStreamComplete?: ((response: OracleResponse) => void) | undefined;
  onStreamError?: ((message: string) => void) | undefined;
  /** Clears stuck intervention once the learner accepts help. */
  onDismissStuck: () => void;
}

/**
 * Chooses between streaming, loading shimmer, or static Oracle transcript shells.
 *
 * @param props - Streaming request metadata, busy flags, and handlers.
 * @returns Primary Oracle visualization region above the composer card.
 */
function OraclePanelStreamingSection({
  streamRequest,
  streamToken,
  sessionId,
  busy,
  response,
  stuckInterventionVisible,
  onAsk,
  onStreamComplete,
  onStreamError,
  onDismissStuck,
}: OraclePanelStreamingSectionProps): ReactNode {
  const handleStuckHelp = (): void => {
    onDismissStuck();
    void onAsk(STUCK_SIMPLIFY_USER_PROMPT).catch((err: unknown): void => {
      logger.error('Oracle stuck-help prompt failed', err);
    });
  };

  if (streamRequest) {
    return (
      <StreamingOraclePanel
        onComplete={onStreamComplete}
        onError={onStreamError}
        onRetry={(): void => {
          void onAsk(streamRequest.userMessage).catch((err: unknown): void => {
            logger.error('Streaming Oracle retry failed', err);
          });
        }}
        request={streamRequest}
        sessionId={sessionId}
        token={streamToken}
      />
    );
  }

  if (busy) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 w-full rounded-[24px] bg-[var(--surface-2)]"></div>
        <div className="h-4 w-3/4 rounded bg-[var(--surface-2)]"></div>
      </div>
    );
  }

  return (
    <>
      <OracleMessage message={response.message} tone={response.tone} />
      {response.proactiveWarning ? (
        <ProactiveWarning message={response.proactiveWarning} />
      ) : null}
      {stuckInterventionVisible ? (
        <section className="rounded-[18px] border border-[var(--civic-amber)] bg-[var(--civic-amber-light)] p-4 text-[var(--ink)]">
          <p className="font-semibold">Stuck here?</p>
          <p className="mt-1 text-sm">I can simplify this to one clear next action.</p>
          <button
            type="button"
            onClick={handleStuckHelp}
            className="mt-3 min-h-10 rounded-full bg-[var(--ink)] px-4 text-sm font-bold text-[var(--surface)]"
          >
            Simplify this step
          </button>
        </section>
      ) : null}
      <TrustPanel sessionId={sessionId} trust={response.trust} />
    </>
  );
}

/**
 * Props for {@link OracleExplanationComposerCard}.
 */
interface OracleExplanationComposerCardProps {
  /** Currently selected cognitive explanation density. */
  cognitiveLevel: CognitiveLevel;
  /** ISO-ish language tag controlling composer microcopy. */
  language: LanguageCode;
  /** Disables interaction while Oracle work is outstanding. */
  busy: boolean | undefined;
  /** Persists learner cognitive preference changes. */
  onCognitiveLevelChange: (level: CognitiveLevel) => void;
  /** Issues a free-form civic question to Oracle. */
  onAsk: (message: string) => Promise<void>;
}

/**
 * Explanation-style toggle plus asynchronous question composer affordances.
 *
 * @param props - Cognitive controls and ask wiring.
 * @returns Bordered card housing learner-driven Oracle prompts.
 */
function OracleExplanationComposerCard({
  cognitiveLevel,
  language,
  busy,
  onCognitiveLevelChange,
  onAsk,
}: OracleExplanationComposerCardProps): ReactNode {
  const [question, setQuestion] = useState<string>('');

  const handleQuestionChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setQuestion(event.target.value);
  };

  const handleAsk = (): void => {
    if (!question.trim()) {
      return;
    }
    void onAsk(question).catch((err: unknown): void => {
      logger.error('OraclePanel ask submission failed', err);
    });
    setQuestion('');
  };

  const languageLabel =
    language === 'en-simple' ? 'simple English' : 'your own words';

  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_24px_var(--shadow)]">
      <p className="text-sm font-semibold text-[var(--ink)]">Explanation style</p>
      <div className="mt-3">
        <CognitiveLevelToggle
          disabled={busy}
          onChange={onCognitiveLevelChange}
          value={cognitiveLevel}
        />
      </div>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm text-[var(--ink-secondary)]">
          Ask in {languageLabel}
        </span>
        <textarea
          className={`${ORACLE_QUESTION_TEXTAREA_MIN_HEIGHT_CLASS} w-full rounded-[18px] border border-[var(--border)] bg-transparent px-4 py-3 text-[var(--ink)] disabled:opacity-50`}
          disabled={busy}
          onChange={handleQuestionChange}
          placeholder={ORACLE_QUESTION_PLACEHOLDER}
          value={question}
        />
      </label>
      <button
        type="button"
        className="mt-3 min-h-12 rounded-full bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--border)] disabled:opacity-50"
        disabled={busy}
        onClick={handleAsk}
      >
        Ask this question
      </button>
    </div>
  );
}

/**
 * Props for {@link OraclePanel}.
 */
export interface OraclePanelProps {
  /** Latest structured Oracle payload powering tone + trust surfaces. */
  response: OracleResponse;
  /** Active localization tag for composer microcopy. */
  language: LanguageCode;
  /** Learner-selected cognitive density for subsequent Oracle turns. */
  cognitiveLevel: CognitiveLevel;
  /** True while a synchronous Oracle round-trip is running. */
  busy?: boolean | undefined;
  /** Session identifier correlating trust telemetry + streaming spans. */
  sessionId: string;
  /** Surfaced when dwell-time heuristics detect learner confusion. */
  stuckInterventionVisible: boolean;
  /** Streaming continuation payload when Gemini chunked mode is active. */
  streamRequest?: OracleRequest | null | undefined;
  /** Resume token when chunked streaming needs reconnect semantics. */
  streamToken?: string | null | undefined;
  /** Dispatches civic prompts into orchestrator-owned Oracle pipelines. */
  onAsk: (message: string) => Promise<void>;
  /** Fires after streamed Oracle JSON completes validation. */
  onStreamComplete?: ((response: OracleResponse) => void) | undefined;
  /** Surfaces recoverable streaming failures to the surrounding shell. */
  onStreamError?: ((message: string) => void) | undefined;
  /** Persists cognitive preference mutations into Electra global store. */
  onCognitiveLevelChange: (level: CognitiveLevel) => void;
  /** Clears stuck affordances once learners acknowledge guidance. */
  onDismissStuck: () => void;
}

/**
 * Right-rail Oracle workspace combining streaming, trust, stuck support, and questioning.
 *
 * @param props - Oracle payload, localization, streaming handles, and learner callbacks.
 * @returns Vertical stack of Oracle visualization plus explanation composer controls.
 */
export function OraclePanel({
  response,
  language,
  cognitiveLevel,
  busy,
  sessionId,
  stuckInterventionVisible,
  streamRequest,
  streamToken,
  onAsk,
  onStreamComplete,
  onStreamError,
  onCognitiveLevelChange,
  onDismissStuck,
}: OraclePanelProps): ReactNode {
  return (
    <div className="space-y-4">
      <OraclePanelStreamingSection
        busy={busy}
        onAsk={onAsk}
        onDismissStuck={onDismissStuck}
        onStreamComplete={onStreamComplete}
        onStreamError={onStreamError}
        response={response}
        sessionId={sessionId}
        streamRequest={streamRequest}
        streamToken={streamToken}
        stuckInterventionVisible={stuckInterventionVisible}
      />
      <OracleExplanationComposerCard
        busy={busy}
        cognitiveLevel={cognitiveLevel}
        language={language}
        onAsk={onAsk}
        onCognitiveLevelChange={onCognitiveLevelChange}
      />
    </div>
  );
}
