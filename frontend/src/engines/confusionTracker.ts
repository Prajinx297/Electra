import { trackEvent } from "../firebase/analytics";

export const trackJourneyStarted = async (
  journeyId: string,
  cognitiveLevel: string,
  language: string
) =>
  trackEvent("journey_started", {
    journeyId,
    cognitiveLevel,
    language
  });

export const trackStepCompleted = async (
  stepId: string,
  timeSpent: number,
  rewound: boolean
) =>
  trackEvent("step_completed", {
    stepId,
    timeSpent,
    rewound
  });

export const trackConfusionDetected = async (
  stepId: string,
  signal: "long_pause" | "reread" | "back"
) =>
  trackEvent("confusion_detected", {
    stepId,
    signal
  });

export const trackSimulationInteracted = async (
  simulationId: string,
  parametersSet: string
) =>
  trackEvent("simulation_interacted", {
    simulationId,
    parametersSet
  });

export const trackLanguageSwitched = async (from: string, to: string) =>
  trackEvent("language_switched", {
    from,
    to
  });

export const buildPauseTracker = (
  stepId: string,
  onDetected: (stepId: string) => void,
  timeoutMs = 10_000
) => window.setTimeout(() => onDetected(stepId), timeoutMs);
