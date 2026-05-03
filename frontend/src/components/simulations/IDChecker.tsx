import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';

import { evaluateIdAnswers } from '../../engines/simulationEngine';
import type { IdAnswers, IdCheckResult } from '../../types';

/** Checkbox metadata tuples pairing {@link IdAnswers} keys with learner-readable captions. */
const ID_CHECK_QUESTION_DEFINITIONS: readonly [keyof IdAnswers, string][] = [
  ['hasPhotoId', 'I have a photo ID'],
  ['hasAddressProof', 'I have one paper with my address'],
  ['nameMatches', 'My name matches my records'],
  ['stateIssued', 'My ID is state-issued'],
];

/** Section heading framing identification preparedness micro-training. */
const ID_CHECK_SECTION_TITLE = 'Check whether your ID may work';

/**
 * Props for {@link IDChecker}.
 */
export interface IDCheckerProps {
  /** Ensures civic simulations remain compatible with Agentic UI registry contracts. */
  readonly civicSimulatorMounted?: true;
}

/**
 * Props for {@link IdQuestionToggleRow}.
 */
interface IdQuestionToggleRowProps {
  /** Stable identifier referencing {@link IdAnswers} fields. */
  answerKey: keyof IdAnswers;
  /** Learner-facing checkbox caption describing identification evidence. */
  label: string;
  /** Reflects whether the learner toggled this credential expectation on. */
  checked: boolean;
  /** Emits checkbox mutations back into parent simulation state. */
  onToggle: (key: keyof IdAnswers, nextValue: boolean) => void;
}

/**
 * Single checkbox row capturing one facet of identification preparedness.
 *
 * @param props - Binding metadata plus mutation handler for civic simulations.
 * @returns Accessible labeled checkbox describing voter identification readiness.
 */
function IdQuestionToggleRow({
  answerKey,
  label,
  checked,
  onToggle,
}: IdQuestionToggleRowProps): ReactNode {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onToggle(answerKey, event.target.checked);
  };

  return (
    <label className="flex min-h-12 items-center gap-3 rounded-[16px] bg-[var(--surface-2)] px-4">
      <input checked={checked} type="checkbox" onChange={handleChange} />
      <span className="text-[var(--ink)]">{label}</span>
    </label>
  );
}

/**
 * Chooses contextual chroming classes based on {@link IdCheckResult.status}.
 *
 * @param status - Simulation-authored readiness classification for voter identification.
 * @returns Tailwind-ready utility classes describing readiness severity.
 */
function idReadinessSurfaceClass(status: IdCheckResult['status']): string {
  if (status === 'valid') {
    return 'bg-[var(--civic-green-light)]';
  }
  if (status === 'partial') {
    return 'bg-[var(--civic-amber-light)]';
  }
  return 'bg-[var(--civic-red-light)]';
}

/**
 * Props for {@link IdReadinessSummary}.
 */
interface IdReadinessSummaryProps {
  /** Structured readiness evaluation emitted by {@link evaluateIdAnswers}. */
  result: IdCheckResult;
}

/**
 * Narrates identification readiness plus actionable remediation steps.
 *
 * @param props - Simulation output describing partial or blocked identification posture.
 * @returns Styled checklist summarizing civic office guidance copy.
 */
function IdReadinessSummary({ result }: IdReadinessSummaryProps): ReactNode {
  const surfaceClass = idReadinessSurfaceClass(result.status);

  return (
    <div className={`mt-5 rounded-[18px] p-4 ${surfaceClass}`}>
      <p className="font-bold text-[var(--ink)]">{result.message}</p>
      <ul className="mt-3 space-y-2 text-[var(--ink-secondary)]">
        {result.nextSteps.map((step: string): ReactNode => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Identification preparedness simulator guiding learners through credential expectations.
 *
 * Wraps {@link evaluateIdAnswers} with checkbox UX tuned for anxiety-reducing civic pedagogy.
 *
 * @param _props - Reserved Agentic registry symmetry prop extension surface.
 * @returns Interactive identification questionnaire plus readiness summary panel.
 */
export default function IDChecker(_props: IDCheckerProps): ReactNode {
  const [answers, setAnswers] = useState<IdAnswers>({
    hasAddressProof: false,
    hasPhotoId: false,
    nameMatches: true,
    stateIssued: false,
  });

  const readiness = useMemo((): IdCheckResult => evaluateIdAnswers(answers), [answers]);

  const handleToggle = (key: keyof IdAnswers, nextValue: boolean): void => {
    setAnswers((current: IdAnswers): IdAnswers => ({
      ...current,
      [key]: nextValue,
    }));
  };

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">{ID_CHECK_SECTION_TITLE}</h2>
      <div className="mt-5 grid gap-3">
        {ID_CHECK_QUESTION_DEFINITIONS.map(([key, label]: [keyof IdAnswers, string]): ReactNode => (
          <IdQuestionToggleRow
            key={key}
            answerKey={key}
            checked={answers[key]}
            label={label}
            onToggle={handleToggle}
          />
        ))}
      </div>
      <IdReadinessSummary result={readiness} />
    </section>
  );
}
