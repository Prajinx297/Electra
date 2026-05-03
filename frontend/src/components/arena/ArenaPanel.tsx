import { useEffect, type ReactNode } from 'react';

import { logger } from '@/lib/logger';

import { useElectraStore } from '../../engines/stateEngine';
import type { RenderKey } from '../../types';

import { ComponentRegistry, preloadComponent } from './ComponentRegistry';

/**
 * Props for {@link ArenaPanel}.
 */
export interface ArenaPanelProps {
  /** Oracle render directive identifying which civic module to mount in the arena. */
  render: RenderKey | null;
  /** Serialized props object forwarded into the mounted civic component. */
  renderProps: Record<string, unknown>;
}

/**
 * Civic arena workspace that mounts Oracle-directed modules and prefetches predictions.
 *
 * Subscribes to {@link useElectraStore}'s `predictedRender` hint so high-confidence next steps
 * can warm chunk caches before the user navigates, shrinking perceived latency.
 *
 * @param props - Active Oracle render target plus forwarded props payload.
 * @returns Composed lazy civic renderer wrapped by error boundaries inside {@link ComponentRegistry}.
 */
export function ArenaPanel({ render, renderProps }: ArenaPanelProps): ReactNode {
  const { predictedRender } = useElectraStore();

  useEffect((): void => {
    void preloadComponent(predictedRender).catch((err: unknown): void => {
      logger.error('Predictive civic module prefetch failed', err);
    });
  }, [predictedRender]);

  return <ComponentRegistry componentProps={renderProps} renderKey={render} />;
}
