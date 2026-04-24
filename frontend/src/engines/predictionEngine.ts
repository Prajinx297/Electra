import type { JourneyState, RenderKey } from "../types";

const predictionMap: Partial<Record<JourneyState, RenderKey>> = {
  WELCOME: "GoalSelect",
  GOAL_SELECT: "RegistrationChecker",
  UNREGISTERED: "DeadlineCalculator",
  DEADLINE_PASSED: "ConsequenceTree",
  ID_ISSUE: "IDChecker",
  POLLING_FINDER: "PollingFinder",
  COUNTING_EXPLAINED: "VoteCounter",
  ACCESSIBILITY_NEEDS_PATH: "AccessibilitySupport",
  COMPLETE: "JourneySummary"
};

export const predictNextRender = (state: JourneyState): RenderKey | null =>
  predictionMap[state] ?? "DecisionCard";

export const scorePrediction = (predicted: RenderKey | null, actual: RenderKey | null) => ({
  hit: Boolean(predicted && actual && predicted === actual)
});
