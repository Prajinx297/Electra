import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VoteCounter from "../../../../src/components/simulations/VoteCounter";
import { trackSimulationInteracted } from "../../../../src/engines/confusionTracker";

vi.mock("../../../../src/engines/confusionTracker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../src/engines/confusionTracker")>()),
  trackSimulationInteracted: vi.fn().mockResolvedValue(undefined)
}));

describe("VoteCounter", () => {
  it("renders tallying controls and tracks slider interaction", async () => {
    render(<VoteCounter />);

    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "13000" } });

    expect(screen.getByText("Watch votes come in")).toBeInTheDocument();
    expect(screen.getAllByTestId("chart-bar")).toHaveLength(2);
    expect(trackSimulationInteracted).toHaveBeenCalled();
  });
});
