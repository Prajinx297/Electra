import type { CognitiveLevel } from '../../types';

interface CognitiveLevelToggleProps {
  value: CognitiveLevel;
  onChange: (value: CognitiveLevel) => void;
  disabled?: boolean | undefined;
}

const levels: CognitiveLevel[] = ['five-year-old', 'citizen', 'policy-expert'];

const labels: Record<string, string> = {
  'five-year-old': '5-year-old',
  citizen: 'Citizen',
  'policy-expert': 'Policy expert',
};

export const CognitiveLevelToggle = ({
  value,
  onChange,
  disabled,
}: CognitiveLevelToggleProps): JSX.Element => (
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
            active
              ? 'bg-[var(--civic-green)] text-white'
              : 'text-[var(--ink)] hover:bg-[var(--border)]'
          }`}
        >
          {labels[level] ?? level}
        </button>
      );
    })}
  </div>
);
