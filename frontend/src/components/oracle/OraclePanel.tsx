import { useState } from 'react';
import type { ChangeEvent } from 'react';

import { StreamingOraclePanel } from '../../features/streaming/StreamingOraclePanel';
import { TrustPanel } from '../../features/trust/TrustPanel';
import type { CognitiveLevel, LanguageCode, OracleRequest, OracleResponse } from '../../types';
import { CognitiveLevelToggle } from '../shared/CognitiveLevelToggle';
import { ProactiveWarning } from '../shared/ProactiveWarning';

import { OracleMessage } from './OracleMessage';


interface OraclePanelProps {
  response: OracleResponse;
  language: LanguageCode;
  cognitiveLevel: CognitiveLevel;
  busy?: boolean | undefined;
  sessionId: string;
  stuckInterventionVisible: boolean;
  streamRequest?: OracleRequest | null | undefined;
  streamToken?: string | null | undefined;
  onAsk: (message: string) => Promise<void>;
  onStreamComplete?: ((response: OracleResponse) => void) | undefined;
  onStreamError?: ((message: string) => void) | undefined;
  onCognitiveLevelChange: (level: CognitiveLevel) => void;
  onDismissStuck: () => void;
}

export const OraclePanel = ({
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
}: OraclePanelProps) => {
  const [question, setQuestion] = useState('');

  const handleQuestionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(event.target.value);
  };

  const handleAsk = () => {
    if (!question.trim()) {
      return;
    }
    void onAsk(question);
    setQuestion('');
  };

  const handleStuckHelp = () => {
    onDismissStuck();
    void onAsk('I am stuck. Please make this simpler and tell me only the next action.');
  };

  return (
    <div className="space-y-4">
      {streamRequest ? (
        <StreamingOraclePanel
          request={streamRequest}
          sessionId={sessionId}
          token={streamToken}
          onComplete={onStreamComplete}
          onError={onStreamError}
          onRetry={() => void onAsk(streamRequest.userMessage)}
        />
      ) : busy ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 w-full rounded-[24px] bg-[var(--surface-2)]"></div>
          <div className="h-4 w-3/4 rounded bg-[var(--surface-2)]"></div>
        </div>
      ) : (
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
      )}

      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_24px_var(--shadow)]">
        <p className="text-sm font-semibold text-[var(--ink)]">Explanation style</p>
        <div className="mt-3">
          <CognitiveLevelToggle
            value={cognitiveLevel}
            onChange={onCognitiveLevelChange}
            disabled={busy}
          />
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-[var(--ink-secondary)]">
            Ask in {language === 'en-simple' ? 'simple English' : 'your own words'}
          </span>
          <textarea
            value={question}
            onChange={handleQuestionChange}
            disabled={busy}
            className="min-h-[112px] w-full rounded-[18px] border border-[var(--border)] bg-transparent text-[var(--ink)] px-4 py-3 disabled:opacity-50"
            placeholder="Ask a question"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={handleAsk}
          className="mt-3 min-h-12 rounded-full bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--border)] disabled:opacity-50"
        >
          Ask this question
        </button>
      </div>
    </div>
  );
};
