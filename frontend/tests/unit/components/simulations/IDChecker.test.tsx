import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IDChecker from "../../../../src/components/simulations/IDChecker";

describe("IDChecker", () => {
  it("updates the ID result as answers change", async () => {
    render(<IDChecker />);

    await userEvent.click(screen.getByLabelText("I have a photo ID"));
    await userEvent.click(screen.getByLabelText("I have one paper with my address"));
    await userEvent.click(screen.getByLabelText("My ID is state-issued"));

    expect(screen.getByText("You likely have what you need.")).toBeInTheDocument();
  });
});
