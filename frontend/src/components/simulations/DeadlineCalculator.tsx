import { useMemo, useState } from "react";
import { calculateDeadline } from "../../engines/simulationEngine";

const stateDeadlines: Record<string, string> = {
  Arizona: "2026-10-05T00:00:00.000Z",
  Georgia: "2026-10-06T00:00:00.000Z",
  Wisconsin: "2026-10-14T00:00:00.000Z",
  "New York": "2026-10-24T00:00:00.000Z"
};

const DeadlineCalculator = () => {
  const [state, setState] = useState("Wisconsin");
  const result = useMemo(
    () => calculateDeadline(state, stateDeadlines[state]),
    [state]
  );

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">See your deadline</h2>
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
          result.urgency === "green"
            ? "bg-[var(--civic-green-light)]"
            : result.urgency === "amber"
              ? "bg-[var(--civic-amber-light)]"
              : "bg-[var(--civic-red-light)]"
        }`}
      >
        <p className="font-bold text-[var(--ink)]">{result.deadlineLabel}</p>
        <p className="mt-1 text-[var(--ink-secondary)]">
          {result.daysRemaining} days left
        </p>
      </div>
      <a
        href={result.officialUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex min-h-12 items-center rounded-full bg-[var(--civic-green)] px-5 text-sm font-semibold text-white"
      >
        Register on your state site
      </a>
    </section>
  );
};

export default DeadlineCalculator;
