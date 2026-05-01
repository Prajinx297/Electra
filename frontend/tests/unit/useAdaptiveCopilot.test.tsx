import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { useAdaptiveCopilot } from "../../src/features/copilot/useAdaptiveCopilot";
import { useElectraStore } from "../../src/engines/stateEngine";

const Harness = () => {
  useAdaptiveCopilot();
  return null;
};

describe("useAdaptiveCopilot", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
  });

  it("surfaces stuck intervention after 30 seconds", () => {
    vi.useFakeTimers();
    render(<Harness />);

    vi.advanceTimersByTime(30000);
    expect(useElectraStore.getState().stuckInterventionVisible).toBe(true);

    vi.useRealTimers();
  });

  it("clears the previous timer when currentState changes", () => {
    vi.useFakeTimers();
    render(<Harness />);

    act(() => {
      vi.advanceTimersByTime(29000);
      useElectraStore.getState().applyOracleResponse("move", {
        message: "Choose a goal.",
        tone: "warm",
        render: "GoalSelect",
        renderProps: {},
        primaryAction: { label: "Continue", action: "continue" },
        secondaryAction: null,
        progress: { step: 1, total: 7, label: "Goal" },
        proactiveWarning: null,
        stateTransition: "GOAL_SELECT",
        cognitiveLevel: "citizen",
        nextAnticipated: "RegistrationChecker"
      });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(useElectraStore.getState().stuckInterventionVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(29000);
    });
    expect(useElectraStore.getState().stuckInterventionVisible).toBe(true);

    vi.useRealTimers();
  });

  it("rewind counter triggers auto-simplification at the threshold", () => {
    useElectraStore.getState().applyOracleResponse("start", {
      message: "Check registration.",
      tone: "warm",
      render: "RegistrationChecker",
      renderProps: {},
      primaryAction: { label: "Check", action: "check" },
      secondaryAction: null,
      progress: { step: 2, total: 7, label: "Registration" },
      proactiveWarning: null,
      stateTransition: "REGISTRATION_CHECK",
      cognitiveLevel: "citizen",
      nextAnticipated: "DeadlineCalculator"
    });

    useElectraStore.getState().rewindToState("WELCOME");
    useElectraStore.getState().rewindToState("WELCOME");

    expect(useElectraStore.getState().backClickCount).toBe(2);
    expect(useElectraStore.getState().cognitiveLevel).toBe("five-year-old");
  });
});
