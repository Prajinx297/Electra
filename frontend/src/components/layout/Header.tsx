import { LanguageSelector } from "../shared/LanguageSelector";
import { getCopy } from "../../i18n";
import type { LanguageCode } from "../../types";

interface HeaderProps {
  language: LanguageCode;
  userLabel: string;
  visualizerOpen?: boolean;
  visualizerEnabled?: boolean;
  simulatorEnabled?: boolean;
  scoreEnabled?: boolean;
  score?: number;
  onLanguageChange: (value: LanguageCode) => void;
  onVisualizerToggle?: () => void;
  onSimulatorOpen?: () => void;
  onScoreOpen?: () => void;
  onSignIn: () => Promise<unknown>;
}

export const Header = ({
  language,
  userLabel,
  visualizerOpen = false,
  visualizerEnabled = false,
  simulatorEnabled = false,
  scoreEnabled = false,
  score = 0,
  onLanguageChange,
  onVisualizerToggle = () => undefined,
  onSimulatorOpen = () => undefined,
  onScoreOpen = () => undefined,
  onSignIn
}: HeaderProps) => (
  <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-[var(--surface)] px-5 py-4 shadow-[0_8px_24px_var(--shadow)]">
    <div>
      <p className="text-sm font-bold tracking-[0.08em] text-[var(--civic-green)]">
        {getCopy(language, "appTitle")}
      </p>
      <p className="text-sm text-[var(--ink-secondary)]">{userLabel}</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      {visualizerEnabled ? (
        <button
          type="button"
          aria-pressed={visualizerOpen}
          onClick={onVisualizerToggle}
          className="min-h-12 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--ink)]"
        >
          Journey
        </button>
      ) : null}
      {simulatorEnabled ? (
        <button
          type="button"
          onClick={onSimulatorOpen}
          className="min-h-12 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--ink)]"
        >
          Simulator
        </button>
      ) : null}
      {scoreEnabled ? (
        <button
          type="button"
          onClick={onScoreOpen}
          className="min-h-12 rounded-lg bg-[var(--civic-green)] px-3 text-sm font-bold text-white shadow-[0_0_0_0_rgba(45,125,90,0.35)]"
        >
          {score} pts
        </button>
      ) : null}
      <LanguageSelector value={language} onChange={onLanguageChange} />
      <button
        type="button"
        onClick={() => void onSignIn()}
        className="min-h-12 rounded-full border border-[var(--border)] px-4 text-sm font-semibold text-[var(--ink)]"
      >
        Sign in with Google
      </button>
    </div>
  </header>
);
