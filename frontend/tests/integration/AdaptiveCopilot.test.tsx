import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  message: "One simple next action: check where you vote.",
  tone: "informative",
  render: "DecisionCard",
  renderProps: { title: "Simplified next step" },
  primaryAction: { label: "Continue", action: "continue" },
  secondaryAction: null,
  progress: { step: 1, total: 7, label: "Getting started" },
  proactiveWarning: null,
  stateTransition: "WELCOME",
  cognitiveLevel: "five-year-old",
  nextAnticipated: "GoalSelect",
  trust: {
    sources: [],
    confidence: 0.9,
    lastVerified: "2026-04-30",
    rationale: "Test response."
  }
};

const streamResponse = async function* () {
  yield { delta: response.message, done: true, trust: response.trust, response };
};

describe("AdaptiveCopilot integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    streamOracleMock.mockReset();
    streamOracleMock.mockImplementation(streamResponse);
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    useElectraStore.getState().completeOnboarding({
      location: "Mumbai, Maharashtra",
      familiarity: "first-time",
      accessibilityNeeds: [],
      toneMode: "citizen",
      completedAt: "2026-04-30T00:00:00.000Z"
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders stuck intervention and uses the oracle when simplifying", async () => {
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText("Stuck here?")).toBeInTheDocument();
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "Simplify this step" }));

    await waitFor(() => expect(streamOracle).toHaveBeenCalled());
    expect(streamOracle).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: expect.stringContaining("make this simpler")
      }),
      expect.any(AbortSignal),
      null
    );
    expect(streamOracle).toHaveBeenCalledTimes(1);
  });
});
