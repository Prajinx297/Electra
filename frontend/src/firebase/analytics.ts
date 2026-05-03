import { logEvent as fbLogEvent } from 'firebase/analytics';

import { analytics } from './config';

const logEvent = (eventName: string, eventParams?: Record<string, string | number | boolean>) => {
  if (analytics) {
    fbLogEvent(analytics, eventName, eventParams);
  }
};

export const trackEvent = async (
  eventName: string,
  eventParams?: Record<string, string | number | boolean>,
) => {
  logEvent(eventName, eventParams);
};

// Common civic tracking events
// ts-prune-ignore-next
export const trackConfusionTime = (stepId: string, seconds: number) => {
  logEvent('confusion_time_spent', { stepId, seconds });
};

// ts-prune-ignore-next
export const trackOracleReread = (stepId: string) => {
  logEvent('oracle_reread', { stepId });
};

// ts-prune-ignore-next
export const trackDetailRequested = (stepId: string) => {
  logEvent('detail_requested', { stepId });
};

// ts-prune-ignore-next
export const trackNavigatedBack = (stepId: string) => {
  logEvent('navigated_back', { stepId });
};

// ts-prune-ignore-next
export const trackPredictionHit = (componentId: string) => {
  logEvent('prediction_hit', { componentId });
};

export const civicEvents = {
  onboardingCompleted: (toneMode: string, location: string) =>
    logEvent('onboarding_completed', { toneMode, location }),

  oracleQueried: (toneMode: string, stepId: string) =>
    logEvent('oracle_queried', { toneMode, stepId }),

  journeyStepCompleted: (stepId: string, timeSpentSeconds: number) =>
    logEvent('journey_step_completed', { stepId, timeSpentSeconds }),

  simulatorCompleted: (anomalyInjected: boolean) =>
    logEvent('simulator_completed', { anomalyInjected }),

  civicScoreShared: (score: number, badge: string) =>
    logEvent('civic_score_shared', { score, badge }),

  sourceOutdatedFlagged: (publisher: string) => logEvent('source_outdated_flagged', { publisher }),

  languageChanged: (from: string, to: string) => logEvent('language_changed', { from, to }),
};
