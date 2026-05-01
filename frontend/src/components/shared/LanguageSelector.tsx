import { getCopy } from "../../i18n";
import type { LanguageCode } from "../../types";

interface LanguageSelectorProps {
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
}

const options: Array<[LanguageCode, string]> = [
  ["en", "EN"],
  ["es", "ES"],
  ["fr", "FR"]
];

export const LanguageSelector = ({ value, onChange }: LanguageSelectorProps) => (
  <div
    className="flex min-h-12 items-center gap-1 rounded-lg border border-[var(--border)] p-1 text-sm text-[var(--ink)]"
    role="group"
    aria-label={getCopy(value, "language")}
  >
    {options.map(([language, label]) => {
      const pressed = value === language || (value === "en-simple" && language === "en");
      return (
        <button
          key={language}
          type="button"
          aria-pressed={pressed}
          onClick={() => onChange(language)}
          className={`min-h-10 rounded-md px-3 text-sm font-bold ${
            pressed ? "bg-[var(--civic-green)] text-white" : "text-[var(--ink)]"
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);
