import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { RenderKey } from "../../types";
import VoteCounter from "../simulations/VoteCounter";

type Factory = () => Promise<{ default: ComponentType<Record<string, unknown>> }>;

const registry: Record<RenderKey, Factory> = {
  WelcomeStep: () => import("../shared/WelcomeStep"),
  GoalSelect: () => import("../shared/GoalSelect"),
  DecisionCard: () => import("../shared/DecisionCard"),
  RegistrationChecker: () => import("../shared/RegistrationChecker"),
  DeadlineCalculator: () => import("../simulations/DeadlineCalculator"),
  IDChecker: () => import("../simulations/IDChecker"),
  PollingFinder: () => import("../simulations/PollingFinder"),
  BallotWalkthrough: () => import("../simulations/BallotWalkthrough"),
  VoteCounter: () => Promise.resolve({ default: VoteCounter }),
  ConsequenceTree: () => import("../journey/ConsequenceTree"),
  AccessibilitySupport: () => import("../shared/AccessibilitySupport"),
  JourneySummary: () => import("../shared/JourneySummary"),
  StatusSummary: () => import("../shared/StatusSummary"),
  JourneyGraph: () => import("../shared/JourneyGraph")
};

const cache = new Map<RenderKey, LazyExoticComponent<ComponentType<Record<string, unknown>>>>();

export const getComponent = (render: RenderKey) => {
  if (!cache.has(render)) {
    cache.set(render, lazy(registry[render]));
  }
  return cache.get(render)!;
};

export const preloadComponent = (render: RenderKey | null) => {
  if (!render) {
    return Promise.resolve();
  }
  return registry[render]();
};
