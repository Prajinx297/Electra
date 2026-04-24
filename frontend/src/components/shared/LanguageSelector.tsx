import { getCopy } from "../../i18n";
import type { LanguageCode } from "../../types";

interface LanguageSelectorProps {
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
}

export const LanguageSelector = ({ value, onChange }: LanguageSelectorProps) => (
  <label className="flex min-h-12 items-center gap-2 text-sm text-[var(--ink)]">
    <span>{getCopy(value, "language")}</span>
    <select
      className="min-h-12 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4"
      value={value}
      onChange={(event) => onChange(event.target.value as LanguageCode)}
      aria-label="Language"
    >
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
      <option value="en-simple">Simplified English</option>
    </select>
  </label>
);
