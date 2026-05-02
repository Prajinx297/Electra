import { preloadComponent } from '../components/arena/ComponentRegistry';
import { trackEvent } from '../firebase/analytics';
import type { JourneyState, RenderKey } from '../types';

const predictionMap: Partial<Record<JourneyState, RenderKey>> = {
  WELCOME: 'GoalSelect',
  GOAL_SELECT: 'RegistrationChecker',
  REGISTRATION_CHECK: 'DeadlineCalculator',
  ID_CHECK: 'IDChecker',
  POLLING_FINDER: 'PollingFinder',
  COUNTING_EXPLAINED: 'VoteCounter',
};

export const predictNextRender = (state: JourneyState): RenderKey =>
  predictionMap[state] ?? 'DecisionCard';

export const scorePrediction = (predicted: RenderKey | null, actual: RenderKey | null) => {
  const hit = Boolean(predicted && actual && predicted === actual);
  if (hit && actual) {
    void trackEvent('prediction_hit', { componentId: actual });
  }
  return { hit };
};

export const prefetchNext = (componentKey: RenderKey | null) => preloadComponent(componentKey);

export const verifyPredictionHit = (actualComponentKey: RenderKey | null) =>
  scorePrediction(actualComponentKey, actualComponentKey).hit;
