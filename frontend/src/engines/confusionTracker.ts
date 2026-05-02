import { useEffect, useRef } from 'react';

import { trackEvent } from '../firebase/analytics';
import type { CognitiveLevel, JourneyState, LanguageCode } from '../types';

export const buildPauseTracker = (
  stepId: JourneyState | string,
  onPause: (stepId: string) => void,
  thresholdMs = 30000,
) => window.setTimeout(() => onPause(stepId), thresholdMs);

export const trackJourneyStarted = (
  journeyId: string,
  cognitiveLevel: CognitiveLevel,
  language: LanguageCode,
) => trackEvent('journey_started', { journeyId, cognitiveLevel, language });

export const trackStepCompleted = (stepId: string, durationMs: number, usedRewind: boolean) =>
  trackEvent('step_completed', { stepId, durationMs, usedRewind });

export const trackConfusionDetected = (stepId: string, reason: string) =>
  trackEvent('confusion_detected', { stepId, reason });

export const trackSimulationInteracted = (simulationId: string, detail: string) =>
  trackEvent('simulation_interacted', { simulationId, detail });

export const trackLanguageSwitched = (from: LanguageCode, to: LanguageCode) =>
  trackEvent('language_switched', { from, to });

export const useConfusionTimer = (stepId: string) => {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    mountTime.current = Date.now();
    return () => {
      const timeSpent = Math.round((Date.now() - mountTime.current) / 1000);
      if (timeSpent > 0) {
        void trackEvent('confusion_time_spent', { stepId, seconds: timeSpent });
      }
    };
  }, [stepId]);
};

export const useOracleScrollTracker = (stepId: string) => {
  const ref = useRef<HTMLDivElement>(null);
  const hasScrolledAway = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            hasScrolledAway.current = true;
            continue;
          }
          if (hasScrolledAway.current) {
            void trackEvent('oracle_reread', { stepId });
            hasScrolledAway.current = false;
          }
        }
      },
      { threshold: 0.5 },
    );

    const current = ref.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [stepId]);

  return ref;
};
