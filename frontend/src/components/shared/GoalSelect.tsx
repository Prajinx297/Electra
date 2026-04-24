import { useElectraStore } from "../../engines/stateEngine";

const goals = [
  "I have never voted before",
  "My registration may have a problem",
  "My ID was not accepted",
  "I want to understand counting",
  "I need accessibility help"
];

const GoalSelect = () => {
  const { draftSelection, setDraftSelection } = useElectraStore();

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">Choose the help you need</h2>
      <p className="mt-2 max-w-prose text-[var(--ink-secondary)]">
        Pick the one that sounds closest to your situation.
      </p>
      <div className="mt-5 space-y-3" role="radiogroup" aria-label="Choose your journey">
        {goals.map((goal) => {
          const selected = draftSelection === goal;
          return (
            <button
              key={goal}
              type="button"
              onClick={() => setDraftSelection(goal)}
              className={`min-h-12 w-full rounded-[18px] border px-4 py-4 text-left ${
                selected
                  ? "border-[var(--civic-green)] bg-[var(--civic-green-light)]"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
              }`}
              aria-pressed={selected}
            >
              {goal}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default GoalSelect;
