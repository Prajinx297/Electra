import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { useElectraStore } from "../../src/engines/stateEngine";

vi.mock("../../src/engines/oracleClient", () => ({
  requestOracle: vi
    .fn()
    .mockResolvedValueOnce({
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
      nextAnticipated: "RegistrationChecker"
    })
    .mockResolvedValueOnce({
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
      nextAnticipated: "DeadlineCalculator"
    })
}));

describe("journey flow", () => {
  beforeEach(() => {
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

  it("renders the first-voter journey sequence", async () => {
    render(<App />);
    await userEvent.type(screen.getByPlaceholderText("Ask a question"), "I've never voted before. Where do I start?");
    await userEvent.click(screen.getByRole("button", { name: /Ask this question/i }));

    await waitFor(
      () => expect(screen.getByRole("button", { name: /I have never voted before/i })).toBeInTheDocument(),
      { timeout: 5000 }
    );
    await userEvent.click(screen.getByRole("button", { name: /I have never voted before/i }));
    await userEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(
      () => expect(screen.getByText(/Check your registration/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  }, 10000);
});
