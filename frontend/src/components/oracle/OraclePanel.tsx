import { useState } from "react";
import { OracleMessage } from "./OracleMessage";
import { CognitiveLevelToggle } from "../shared/CognitiveLevelToggle";
import { ProactiveWarning } from "../shared/ProactiveWarning";
import type { CognitiveLevel, LanguageCode, OracleResponse } from "../../types";

interface OraclePanelProps {
  response: OracleResponse;
  language: LanguageCode;
  cognitiveLevel: CognitiveLevel;
  onAsk: (message: string) => Promise<void>;
  onCognitiveLevelChange: (level: CognitiveLevel) => void;
}

export const OraclePanel = ({
  response,
  language,
  cognitiveLevel,
  onAsk,
  onCognitiveLevelChange
}: OraclePanelProps) => {
  const [question, setQuestion] = useState("");

  return (
    <div className="space-y-4">
      <OracleMessage message={response.message} tone={response.tone} />
      {response.proactiveWarning ? <ProactiveWarning message={response.proactiveWarning} /> : null}
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_24px_var(--shadow)]">
        <p className="text-sm font-semibold text-[var(--ink)]">Explanation style</p>
        <div className="mt-3">
          <CognitiveLevelToggle value={cognitiveLevel} onChange={onCognitiveLevelChange} />
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-[var(--ink-secondary)]">
            Ask in {language === "en-simple" ? "simple English" : "your own words"}
          </span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="min-h-[112px] w-full rounded-[18px] border border-[var(--border)] px-4 py-3"
            placeholder="Ask a question"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!question.trim()) {
              return;
            }
            void onAsk(question);
            setQuestion("");
          }}
          className="mt-3 min-h-12 rounded-full bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)]"
        >
          Ask this question
        </button>
      </div>
    </div>
  );
};
