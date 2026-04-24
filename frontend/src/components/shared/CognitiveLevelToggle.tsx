import type { CognitiveLevel } from "../../types";

interface CognitiveLevelToggleProps {
  value: CognitiveLevel;
  onChange: (value: CognitiveLevel) => void;
  disabled?: boolean;
}

const levels: CognitiveLevel[] = ["simple", "normal", "detailed"];

export const CognitiveLevelToggle = ({
  value,
  onChange,
  disabled
}: CognitiveLevelToggleProps) => (
  <div
    className="flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1"
    aria-label="Explanation depth"
  >
    {levels.map((level) => {
      const active = level === value;
      return (
        <button
          key={level}
          type="button"
          disabled={disabled}
          onClick={() => onChange(level)}
          className={`min-h-12 rounded-full px-4 text-sm font-semibold transition-opacity disabled:opacity-50 ${
            active ? "bg-[var(--civic-green)] text-white" : "text-[var(--ink)] hover:bg-[var(--border)]"
          }`}
        >
          {level}
        </button>
      );
    })}
  </div>
);
