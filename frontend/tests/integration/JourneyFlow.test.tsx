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

const trust = {
  sources: [],
  confidence: 0.9,
  lastVerified: "2026-04-30",
  rationale: "Test trust."
};

const firstResponse: OracleResponse = {
  message: "Choose the help you need.",
  tone: "warm",
  render: "GoalSelect",
  renderProps: {},
  primaryAction: { label: "Continue", action: "continue" },
  secondaryAction: null,
  progress: { step: 1, total: 7, label: "Choosing your goal" },
  proactiveWarning: null,
  stateTransition: "GOAL_SELECT",
  cognitiveLevel: "simple",
  nextAnticipated: "RegistrationChecker",
  trust
};

const secondResponse: OracleResponse = {
  message: "We will start by checking registration.",
  tone: "warm",
  render: "RegistrationChecker",
  renderProps: {},
  primaryAction: { label: "Check my registration", action: "check my registration" },
  secondaryAction: null,
  progress: { step: 2, total: 7, label: "Checking registration" },
  proactiveWarning: null,
  stateTransition: "REGISTRATION_CHECK",
  cognitiveLevel: "simple",
  nextAnticipated: "DeadlineCalculator",
  trust
};

const streamResponse = (response: OracleResponse) =>
  async function* () {
    yield { delta: response.message, done: true, trust: response.trust, response };
  };

describe("journey flow", () => {
  beforeEach(() => {
    streamOracleMock.mockReset();
    streamOracleMock
      .mockImplementationOnce(streamResponse(firstResponse))
      .mockImplementationOnce(streamResponse(secondResponse));
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    useElectraStore.getState().completeOnboarding({
      location: "Atlanta, GA",
      familiarity: "first-time",
      accessibilityNeeds: [],
      toneMode: "citizen",
      completedAt: "2026-04-30T00:00:00.000Z"
    });
    window.history.replaceState({}, "", "/");
  });

  it("streams the first-voter journey sequence into the state engine", async () => {
    render(<App />);
    await userEvent.type(screen.getByPlaceholderText("Ask a question"), "I've never voted before. Where do I start?");
    await userEvent.click(screen.getByRole("button", { name: /Ask this question/i }));

    await waitFor(
      () => expect(useElectraStore.getState().currentResponse.message).toContain("Choose the help you need"),
      { timeout: 5000 }
    );
    expect(streamOracle).toHaveBeenCalled();
  }, 10000);
});
