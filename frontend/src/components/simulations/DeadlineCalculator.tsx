import { useMemo, useState } from 'react';

import { calculateDeadline } from '../../engines/simulationEngine';

// Indian state Form 6 registration cutoff dates
// ECI rule: Form 6 must be submitted 30 days before the qualifying date (Jan 1 of qualifying year)
// These dates represent the Form 6 deadline for the next electoral roll revision
const stateDeadlines: Record<string, string> = {
  Maharashtra: '2026-12-02T00:00:00.000Z',
  'Tamil Nadu': '2026-12-02T00:00:00.000Z',
  'Uttar Pradesh': '2026-12-02T00:00:00.000Z',
  'West Bengal': '2026-12-02T00:00:00.000Z',
  Karnataka: '2026-12-02T00:00:00.000Z',
  Rajasthan: '2026-12-02T00:00:00.000Z',
  Gujarat: '2026-12-02T00:00:00.000Z',
  'Madhya Pradesh': '2026-12-02T00:00:00.000Z',
};
const defaultDeadline = '2026-12-02T00:00:00.000Z';

const DeadlineCalculator = () => {
  const [state, setState] = useState('Maharashtra');
  const result = useMemo(
    () =>
      calculateDeadline(
        state,
        stateDeadlines[state] ?? stateDeadlines.Maharashtra ?? defaultDeadline,
      ),
    [state],
  );

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">Check your Form 6 deadline</h2>
      <p className="mt-2 text-sm text-[var(--ink-secondary)]">
        Form 6 must be submitted 30 days before the ECI qualifying date to appear on the electoral roll.
      </p>
      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Your state</span>
        <select
          value={state}
          onChange={(event) => setState(event.target.value)}
          className="min-h-12 w-full rounded-[16px] border border-[var(--border)] px-4"
        >
          {Object.keys(stateDeadlines).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <div
        className={`mt-5 rounded-[18px] p-5 ${
          result.urgency === 'green'
            ? 'bg-[var(--civic-green-light)]'
            : result.urgency === 'amber'
              ? 'bg-[var(--civic-amber-light)]'
              : 'bg-[var(--civic-red-light)]'
        }`}
      >
        <p className="font-bold text-[var(--ink)]">{result.deadlineLabel}</p>
        <p className="mt-1 text-[var(--ink-secondary)]">{result.daysRemaining} days left</p>
      </div>
      <a
        href={result.officialUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex min-h-12 items-center rounded-full bg-[var(--civic-green)] px-5 text-sm font-semibold text-white"
      >
        Register on your state election commission site
      </a>
    </section>
  );
};

export default DeadlineCalculator;
