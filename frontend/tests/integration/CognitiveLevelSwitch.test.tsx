import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { streamOracle } from "../../src/engines/oracleClient";
import { useElectraStore } from "../../src/engines/stateEngine";
import type { OracleResponse } from "../../src/types";

vi.mock("../../src/engines/oracleClient", () => ({
  requestOracle: vi.fn(),
  streamOracle: vi.fn()
}));

const streamOracleMock = streamOracle as unknown as Mock;

const response: OracleResponse = {
  message: "Here is a more detailed explanation.",
  tone: "informative",
  render: "DecisionCard",
  renderProps: {},
  primaryAction: { label: "Continue", action: "continue" },
  secondaryAction: null,
  progress: { step: 1, total: 7, label: "Getting started" },
  proactiveWarning: null,
  stateTransition: "WELCOME",
  cognitiveLevel: "detailed",
  nextAnticipated: "GoalSelect",
  trust: {
    sources: [],
    confidence: 0.9,
    lastVerified: "2026-04-30",
    rationale: "Test trust."
  }
};

const streamResponse = async function* () {
  yield { delta: response.message, done: true, trust: response.trust, response };
};

describe("cognitive level switch", () => {
  beforeEach(() => {
    streamOracleMock.mockReset();
    streamOracleMock.mockImplementation(streamResponse);
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    useElectraStore.getState().completeOnboarding({
      location: "Atlanta, GA",
      familiarity: "first-time",
      accessibilityNeeds: [],
      toneMode: "citizen",
      completedAt: "2026-04-30T00:00:00.000Z"
    });
  });

  it("re-prompts the oracle on level change", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Policy expert" }));
    await waitFor(() => expect(streamOracle).toHaveBeenCalled());
  });
});
