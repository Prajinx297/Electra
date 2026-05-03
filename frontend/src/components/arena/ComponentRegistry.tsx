import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

import type { RenderKey } from '../../types';
import VoteCounter from '../simulations/VoteCounter';


type Factory = () => Promise<{ default: ComponentType<Record<string, unknown>> }>;

const registry: Partial<Record<RenderKey, Factory>> = {
  WelcomeStep: () => import('../shared/WelcomeStep'),
  GoalSelect: () => import('../shared/GoalSelect'),
  DecisionCard: () => import('../shared/DecisionCard'),
  RegistrationChecker: () => import('../shared/RegistrationChecker'),
  DeadlineCalculator: () => import('../simulations/DeadlineCalculator'),
  IDChecker: () => import('../simulations/IDChecker'),
  PollingFinder: () => import('../simulations/PollingFinder'),
  BallotWalkthrough: () => import('../simulations/BallotWalkthrough'),
  VoteCounter: () => Promise.resolve({ default: VoteCounter }),
  ConsequenceTree: () => import('../journey/ConsequenceTree'),
  AccessibilitySupport: () => import('../shared/AccessibilitySupport'),
  JourneySummary: () => import('../shared/JourneySummary'),
  StatusSummary: () => import('../shared/StatusSummary'),
  JourneyGraph: () => import('../shared/JourneyGraph'),
};

const fallbackFactory: Factory = () => import('../shared/DecisionCard');

const cache = new Map<RenderKey, LazyExoticComponent<ComponentType<Record<string, unknown>>>>();

export const getComponent = (
  render: RenderKey,
): LazyExoticComponent<ComponentType<Record<string, unknown>>> => {
  if (!cache.has(render)) {
    cache.set(render, lazy(registry[render] ?? fallbackFactory));
  }

  const component = cache.get(render);
  if (component === undefined) {
    throw new Error(`Component not registered for render key: ${render}`);
  }

  return component;
};

export const preloadComponent = (render: RenderKey | null): Promise<unknown> => {
  if (!render) {
    return Promise.resolve();
  }
  return (registry[render] ?? fallbackFactory)();
};
