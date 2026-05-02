import { Suspense, useEffect, useMemo } from 'react';

import { useElectraStore } from '../../engines/stateEngine';
import { RenderKey, type RenderKey as RenderKeyType } from '../../types';

import { getComponent, preloadComponent } from './ComponentRegistry';

interface ArenaPanelProps {
  render: RenderKeyType | null;
  renderProps: Record<string, unknown>;
}

export const ArenaPanel = ({ render, renderProps }: ArenaPanelProps): JSX.Element => {
  const { predictedRender } = useElectraStore();

  useEffect(() => {
    void preloadComponent(predictedRender);
  }, [predictedRender]);

  const Component = useMemo(() => getComponent(render ?? RenderKey.DecisionCard), [render]);

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
