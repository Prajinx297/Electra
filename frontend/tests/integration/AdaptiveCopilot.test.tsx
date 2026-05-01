import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";
import { requestOracle } from "../../src/engines/oracleClient";
import { useElectraStore } from "../../src/engines/stateEngine";

vi.mock("../../src/engines/oracleClient", () => ({
  requestOracle: vi.fn().mockResolvedValue({
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
  })
}));

describe("AdaptiveCopilot integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    useElectraStore.getState().completeOnboarding({
      location: "Atlanta, GA",
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

    await waitFor(() => expect(requestOracle).toHaveBeenCalled());
    expect(requestOracle).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: expect.stringContaining("make this simpler")
      }),
      null
    );
    await waitFor(() => {
      expect(screen.getAllByText(/One simple next action/i).length).toBeGreaterThan(0);
    });
  });
});
