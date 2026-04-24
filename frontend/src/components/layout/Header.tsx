import { LanguageSelector } from "../shared/LanguageSelector";
import { getCopy } from "../../i18n";
import type { LanguageCode } from "../../types";

interface HeaderProps {
  language: LanguageCode;
  userLabel: string;
  onLanguageChange: (value: LanguageCode) => void;
  onSignIn: () => Promise<unknown>;
}

export const Header = ({
  language,
  userLabel,
  onLanguageChange,
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
