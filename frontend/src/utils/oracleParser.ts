import type { OracleResponse, RenderKey } from "../types";

export const VALID_RENDER_KEYS: RenderKey[] = [
  "WelcomeStep",
  "GoalSelect",
  "DecisionCard",
  "RegistrationChecker",
  "DeadlineCalculator",
  "IDChecker",
  "PollingFinder",
  "BallotWalkthrough",
  "VoteCounter",
  "ConsequenceTree",
  "AccessibilitySupport",
  "JourneySummary",
  "StatusSummary",
  "JourneyGraph"
];

export const FALLBACK_ORACLE_RESPONSE: OracleResponse = {
  message: "Let's take this one small step at a time.",
  tone: "warm",
  render: "WelcomeStep",
  renderProps: {},
  primaryAction: {
    label: "Start here",
    action: "start-journey"
  },
  secondaryAction: null,
  progress: {
    step: 1,
    total: 7,
    label: "Getting started"
  },
  proactiveWarning: null,
  stateTransition: "WELCOME",
  cognitiveLevel: "simple",
  nextAnticipated: "GoalSelect",
  confidence: 0.91
};

const normalizeRender = (render: unknown): RenderKey | null =>
  typeof render === "string" && VALID_RENDER_KEYS.includes(render as RenderKey)
    ? (render as RenderKey)
    : FALLBACK_ORACLE_RESPONSE.render;

const extractJson = (raw: string) => {
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  return first >= 0 && last > first ? raw.slice(first, last + 1) : raw;
};

export const parseOracleResponse = (raw: string): OracleResponse => {
  try {
    const parsed = JSON.parse(extractJson(raw)) as Partial<OracleResponse>;
    return {
      ...FALLBACK_ORACLE_RESPONSE,
      ...parsed,
      render: normalizeRender(parsed.render),
      renderProps: parsed.renderProps ?? {},
      primaryAction: parsed.primaryAction ?? FALLBACK_ORACLE_RESPONSE.primaryAction,
      secondaryAction:
        parsed.secondaryAction === undefined
          ? FALLBACK_ORACLE_RESPONSE.secondaryAction
          : parsed.secondaryAction,
      progress: parsed.progress ?? FALLBACK_ORACLE_RESPONSE.progress,
      cognitiveLevel:
        parsed.cognitiveLevel ?? FALLBACK_ORACLE_RESPONSE.cognitiveLevel
    };
  } catch {
    return FALLBACK_ORACLE_RESPONSE;
  }
};
