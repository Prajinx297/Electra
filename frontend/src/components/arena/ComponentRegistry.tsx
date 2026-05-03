import {
  lazy,
  Suspense,
  useMemo,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';

import { logger } from '@/lib/logger';

import { RenderKey, type RenderKey as RenderKeyType } from '../../types';
import { OracleErrorBoundary } from '../errors/OracleErrorBoundary';
import VoteCounter from '../simulations/VoteCounter';

/** CSS utility classes for the lazy-route suspense shell while civic modules load. */
const ARENA_SUSPENSE_FALLBACK_CLASS =
  'rounded-[24px] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]';

/** Copy shown while the next civic module chunk is loading. */
const ARENA_MODULE_LOADING_MESSAGE = 'Loading your next step...';

/** Oracle render target used when the incoming render key is null or unknown. */
const DEFAULT_FALLBACK_RENDER_KEY: RenderKeyType = RenderKey.DecisionCard;

/**
 * Factory that dynamically imports a civic module's default export.
 *
 * @returns Promise resolving to the module's default export component.
 */
type LazyModuleFactory = () => Promise<{ default: ComponentType<Record<string, unknown>> }>;

/**
 * Maps Oracle render keys to dynamic import factories for code-split civic modules.
 *
 * Each entry corresponds to a render directive the Oracle may emit; factories are
 * invoked only when that module is first requested.
 */
export const ORACLE_MODULE_REGISTRY: Partial<Record<RenderKeyType, LazyModuleFactory>> = {
  WelcomeStep: () => import('../shared/WelcomeStep'),
  GoalSelect: () => import('../shared/GoalSelect'),
  DecisionCard: () => import('../shared/DecisionCard'),
  RegistrationChecker: () => import('../shared/RegistrationChecker'),
  DeadlineCalculator: () => import('../simulations/DeadlineCalculator'),
  IDChecker: () => import('../simulations/IDChecker'),
  PollingFinder: () => import('../simulations/PollingFinder'),
  BallotWalkthrough: () => import('../simulations/BallotWalkthrough'),
  VoteCounter: (): Promise<{ default: ComponentType<Record<string, unknown>> }> =>
    Promise.resolve({ default: VoteCounter }),
  ConsequenceTree: () => import('../journey/ConsequenceTree'),
  AccessibilitySupport: () => import('../shared/AccessibilitySupport'),
  JourneySummary: () => import('../shared/JourneySummary'),
  StatusSummary: () => import('../shared/StatusSummary'),
  JourneyGraph: () => import('../shared/JourneyGraph'),
};

/**
 * Factory used when no registry entry exists for the requested render key.
 * Keeps the Agentic UI usable even after schema drift or partial deployments.
 */
const FALLBACK_MODULE_FACTORY: LazyModuleFactory = () => import('../shared/DecisionCard');

/**
 * Memoized lazy components keyed by Oracle render directive.
 */
const lazyModuleCache = new Map<
  RenderKeyType,
  LazyExoticComponent<ComponentType<Record<string, unknown>>>
>();

/**
 * Full-screen-adjacent suspense fallback while a civic chunk resolves.
 *
 * @returns Loading placeholder for lazy civic routes.
 */
function ArenaModuleSuspenseFallback(): ReactNode {
  return (
    <div className={ARENA_SUSPENSE_FALLBACK_CLASS}>
      {ARENA_MODULE_LOADING_MESSAGE}
    </div>
  );
}

/**
 * Retrieves a lazily loaded component for the given render key.
 * Results are cached so repeated mounts do not recreate lazy wrappers.
 *
 * @param render - Oracle-selected render key identifying which component to load.
 * @returns Cached lazy exotic component for that render key.
 * @throws Error When the lazy wrapper cannot be resolved from cache after registration.
 */
export const getComponent = (
  render: RenderKeyType,
): LazyExoticComponent<ComponentType<Record<string, unknown>>> => {
  if (!lazyModuleCache.has(render)) {
    lazyModuleCache.set(render, lazy(ORACLE_MODULE_REGISTRY[render] ?? FALLBACK_MODULE_FACTORY));
  }

  const component = lazyModuleCache.get(render);
  if (component === undefined) {
    throw new Error(`Component not registered for render key: ${String(render)}`);
  }

  return component;
};

/**
 * Starts loading a civic module chunk ahead of time to reduce perceived latency.
 *
 * @param render - Render key to preload, or null to no-op.
 * @returns Resolved module namespace for the imported chunk, or undefined when render is null.
 * @throws Error When the dynamic import fails after logging the underlying cause.
 */
export const preloadComponent = async (
  render: RenderKeyType | null,
): Promise<{ default: ComponentType<Record<string, unknown>> } | undefined> => {
  if (!render) {
    return undefined;
  }
  try {
    return await (ORACLE_MODULE_REGISTRY[render] ?? FALLBACK_MODULE_FACTORY)();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to preload component';
    logger.error('Component preload failed', err);
    throw new Error(message);
  }
};

/**
 * Props for the {@link ComponentRegistry} renderer.
 */
export interface ComponentRegistryProps {
  /** Oracle-selected key identifying which civic module to mount. */
  renderKey: RenderKeyType | null;
  /** Serialized props forwarded into the mounted civic component instance. */
  componentProps: Record<string, unknown>;
  /** Session identifier reserved for future confusion telemetry wiring. */
  sessionId?: string;
}

/**
 * Renders the civic module implied by the Oracle render directive.
 *
 * Acts as the Agentic UI dumb renderer: routing is entirely driven by Oracle JSON;
 * this component only resolves {@link RenderKey} values to lazy chunks and mounts them.
 * Each dynamic mount is wrapped in {@link OracleErrorBoundary} so malformed Oracle output
 * cannot crash the full shell; loading states use {@link Suspense}.
 *
 * @param props - Render key, forwarded props, and optional session id.
 * @returns Lazy-loaded civic module tree inside error and suspense boundaries.
 */
export function ComponentRegistry({
  renderKey,
  componentProps,
}: ComponentRegistryProps): ReactNode {
  const LazyModule = useMemo(
    (): LazyExoticComponent<ComponentType<Record<string, unknown>>> =>
      getComponent(renderKey ?? DEFAULT_FALLBACK_RENDER_KEY),
    [renderKey],
  );

  return (
    <OracleErrorBoundary>
      <Suspense fallback={<ArenaModuleSuspenseFallback />}>
        <LazyModule {...componentProps} />
      </Suspense>
    </OracleErrorBoundary>
  );
}
