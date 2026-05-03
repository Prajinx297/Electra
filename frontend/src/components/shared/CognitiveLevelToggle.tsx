import type { ReactNode } from 'react';

import type { CognitiveLevel } from '../../types';

/** Canonical cognitive fidelity presets surfaced by Oracle-guided journeys. */
const COGNITIVE_LEVEL_SEQUENCE: readonly CognitiveLevel[] = [
  'five-year-old',
  'citizen',
  'policy-expert',
] as const;

/** Student-facing labels keyed by backend cognitive enumeration tokens. */
const COGNITIVE_LEVEL_LABELS: Record<CognitiveLevel, string> = {
  'five-year-old': '5-year-old',
  citizen: 'Citizen',
  'policy-expert': 'Policy expert',
  beginner: 'Beginner',
  advanced: 'Advanced',
  simple: 'Simple',
  normal: 'Normal',
  detailed: 'Detailed',
  legal: 'Legal',
};

/**
 * Props for {@link CognitiveLevelToggle}.
 */
export interface CognitiveLevelToggleProps {
  /** Currently active cognitive preset mirrored by pressed semantics. */
  value: CognitiveLevel;
  /** Emits learner-selected presets upward into Electra orchestration. */
  onChange: (value: CognitiveLevel) => void;
  /** Disables interaction while asynchronous Oracle work is outstanding. */
  disabled?: boolean | undefined;
}

/**
 * Props for a single fidelity preset pill inside {@link CognitiveLevelToggle}.
 */
interface CognitiveLevelToggleOptionProps {
  /** Cognitive enumeration token represented by the pill. */
  level: CognitiveLevel;
  /** Whether this pill represents the active preset. */
  active: boolean;
  /** Disables pointer interactions for the pill. */
  disabled: boolean | undefined;
  /** Invoked when the learner selects this cognitive preset. */
  onSelect: (level: CognitiveLevel) => void;
}

/**
 * Individual selectable cognitive fidelity pill.
 *
 * @param props - Level metadata plus pressed/disabled wiring.
 * @returns Segmented-control button styled for civic fidelity presets.
 */
function CognitiveLevelToggleOption({
  level,
  active,
  disabled,
  onSelect,
}: CognitiveLevelToggleOptionProps): ReactNode {
  const handleClick = (): void => {
    onSelect(level);
  };

  const label = COGNITIVE_LEVEL_LABELS[level] ?? level;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`min-h-12 rounded-full px-4 text-sm font-semibold transition-opacity disabled:opacity-50 ${
        active ? 'bg-[var(--civic-green)] text-white' : 'text-[var(--ink)] hover:bg-[var(--border)]'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Segmented control that binds learner cognitive fidelity preferences for Oracle prompts.
 *
 * @param props - Active value, mutation handler, and optional disabled flag.
 * @returns Accessible pill group labelled as explanation depth controls.
 */
export function CognitiveLevelToggle({
  value,
  onChange,
  disabled,
}: CognitiveLevelToggleProps): ReactNode {
  return (
    <div
      aria-label="Explanation depth"
      className="flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1"
    >
      {COGNITIVE_LEVEL_SEQUENCE.map((level: CognitiveLevel): ReactNode => {
        const active = level === value;
        return (
          <CognitiveLevelToggleOption
            key={level}
            active={active}
            disabled={disabled}
            level={level}
            onSelect={onChange}
          />
        );
      })}
    </div>
  );
}
