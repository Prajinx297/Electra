import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JourneySidebar } from "../../../../src/components/journey/JourneySidebar";
import { useElectraStore } from "../../../../src/engines/stateEngine";

describe("JourneySidebar", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
  });

  it("renders seen states and can bookmark a state", async () => {
    render(<JourneySidebar />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(useElectraStore.getState().bookmarkedStates).toContain("WELCOME");
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
  });
});
