import type { OracleResponse } from "../../../src/types";

export const oracleResponseFixture: OracleResponse = {
  message: "Hi. I can help you take the next voting step.",
  tone: "warm",
  render: "WelcomeStep",
  renderProps: {
    title: "You are not behind.",
    description: "We will do one small step together."
  },
  primaryAction: { label: "Start", action: "start" },
  secondaryAction: { label: "Tell me more", action: "tell_more" },
  progress: { step: 1, total: 7, label: "Getting started" },
  proactiveWarning: null,
  stateTransition: "WELCOME",
  cognitiveLevel: "citizen",
  nextAnticipated: "GoalSelect",
  confidence: 0.91,
  trust: {
    sources: [
      {
        id: "usa-gov-voting",
        title: "Voting and elections",
        publisher: "USAGov",
        url: "https://www.usa.gov/voting",
        lastVerified: "2026-04-30"
      }
    ],
    confidence: 0.91,
    lastVerified: "2026-04-30",
    rationale: "Official source."
  }
};
