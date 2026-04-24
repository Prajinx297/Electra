import { JOURNEY_GRAPH, useElectraStore } from "../../engines/stateEngine";

export const JourneySidebar = () => {
  const { history, currentState, rewindToState, bookmarkState, bookmarkedStates } =
    useElectraStore();
  const seenStates = Array.from(new Set(history.map((entry) => entry.state)));

  return (
    <aside className="hidden w-[280px] shrink-0 lg:block">
      <div className="sticky top-6 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_24px_var(--shadow)]">
        <h2 className="text-lg font-bold text-[var(--ink)]">Your progress</h2>
        <div className="mt-5 space-y-3">
          {seenStates.map((state) => {
            const isCurrent = state === currentState;
            const isBookmarked = bookmarkedStates.includes(state);
            return (
              <div
                key={state}
                className={`flex items-center gap-3 rounded-[18px] px-4 py-3 ${
                  isCurrent
                    ? "bg-[var(--civic-green-light)] text-[var(--ink)]"
                    : "bg-[var(--surface-2)] text-[var(--ink)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => rewindToState(state)}
                  className="min-h-12 flex-1 text-left"
                >
                  <span className="font-semibold">{JOURNEY_GRAPH[state].label}</span>
                </button>
                <button
                  type="button"
                  onClick={() => bookmarkState(state)}
                  className="min-h-12 text-xs"
                  aria-pressed={isBookmarked}
                >
                  {isBookmarked ? "Saved" : "Save"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
