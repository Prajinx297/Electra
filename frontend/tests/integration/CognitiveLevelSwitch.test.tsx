import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { requestOracle } from "../../src/engines/oracleClient";
import { useElectraStore } from "../../src/engines/stateEngine";

vi.mock("../../src/engines/oracleClient", () => ({
  requestOracle: vi.fn().mockResolvedValue({
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
    nextAnticipated: "GoalSelect"
  })
}));

describe("cognitive level switch", () => {
  beforeEach(() => {
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
    await waitFor(() => expect(requestOracle).toHaveBeenCalled());
  });
});
