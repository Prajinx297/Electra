import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JourneyVisualizer } from "../../src/features/journey/JourneyVisualizer";
import { buildHistoryEntry, useElectraStore } from "../../src/engines/stateEngine";

vi.mock("../../src/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => true
}));

describe("JourneyVisualizer integration", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    const response = useElectraStore.getState().currentResponse;
    useElectraStore.setState({
      currentState: "GOAL_SELECT",
      history: [
        buildHistoryEntry("WELCOME", "Started", response),
        buildHistoryEntry("GOAL_SELECT", "Next", {
          ...response,
          stateTransition: "GOAL_SELECT"
        })
      ]
    });
  });

  it("renders DAG nodes, replays completed states, and dispatches node-click actions", async () => {
    const onExplainStep = vi.fn().mockResolvedValue(undefined);
    render(<JourneyVisualizer onExplainStep={onExplainStep} />);

    expect(screen.getByLabelText(/animated civic journey graph/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Welcome/i })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: /Choose your goal/i })).toHaveAttribute("aria-current", "step");

    fireEvent.click(screen.getByRole("button", { name: /Welcome/i }));
    expect(onExplainStep).toHaveBeenCalledWith("Welcome");

    fireEvent.click(screen.getByRole("button", { name: /Replay my journey/i }));
    expect(screen.getByLabelText(/Journey minimap/i)).toBeInTheDocument();
  });
});
