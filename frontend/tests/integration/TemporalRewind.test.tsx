import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JourneySidebar } from "../../src/components/journey/JourneySidebar";
import { useElectraStore } from "../../src/engines/stateEngine";

describe("temporal rewind", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    const store = useElectraStore.getState();
    store.applyOracleResponse("never voted", {
      message: "Check registration.",
      tone: "warm",
      render: "RegistrationChecker",
      renderProps: {},
      primaryAction: { label: "Continue", action: "continue" },
      secondaryAction: null,
      progress: { step: 2, total: 7, label: "Checking registration" },
      proactiveWarning: null,
      stateTransition: "REGISTRATION_CHECK",
      cognitiveLevel: "simple",
      nextAnticipated: "DeadlineCalculator"
    });
  });

  it("restores a prior state", async () => {
    render(<JourneySidebar />);
    await userEvent.click(screen.getByText(/Welcome/i));
    expect(useElectraStore.getState().currentState).toBe("WELCOME");
  });
});
