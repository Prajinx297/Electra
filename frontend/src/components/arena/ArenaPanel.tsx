import { Suspense, useEffect, useMemo } from "react";
import { getComponent, preloadComponent } from "./ComponentRegistry";
import { useElectraStore } from "../../engines/stateEngine";
import type { RenderKey } from "../../types";

interface ArenaPanelProps {
  render: RenderKey | null;
  renderProps: Record<string, unknown>;
}

export const ArenaPanel = ({ render, renderProps }: ArenaPanelProps) => {
  const { predictedRender } = useElectraStore();

  useEffect(() => {
    void preloadComponent(predictedRender);
  }, [predictedRender]);

  const Component = useMemo(
    () => getComponent(render ?? "DecisionCard"),
    [render]
  );

  return (
    <Suspense
      fallback={
        <div className="rounded-[24px] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
          Loading your next step...
        </div>
      }
    >
      <Component {...renderProps} />
    </Suspense>
  );
};
