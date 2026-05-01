import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PollingFinder from "../../../../src/components/simulations/PollingFinder";
import { useElectraStore } from "../../../../src/engines/stateEngine";

describe("PollingFinder", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
  });

  it("renders fallback polling locations and filters accessible places", async () => {
    render(<PollingFinder />);

    expect(screen.getAllByText("Central Library").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByLabelText("Accessible places only"));
    expect(screen.queryByText("Town Hall")).not.toBeInTheDocument();
  });

  it("downloads a calendar reminder", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<PollingFinder />);

    await userEvent.click(screen.getByRole("button", { name: "Add to calendar" }));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
