import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import App from "../../src/App";
import { useElectraStore } from "../../src/engines/stateEngine";
import { persistSession } from "../../src/firebase/firestore";

vi.mock("../../src/firebase/firestore", () => ({
  persistSession: vi.fn().mockResolvedValue(undefined)
}));

describe("firebase sync", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
  });

  it("writes state to firestore on transition", async () => {
    render(<App />);
    useElectraStore.getState().applyOracleResponse("hello", {
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
    });

    await vi.waitFor(() => expect(persistSession).toHaveBeenCalled());
  });
});
