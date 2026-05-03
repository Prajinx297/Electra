import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeadlineCalculator from "../../../../src/components/simulations/DeadlineCalculator";

describe("DeadlineCalculator", () => {
  it("renders deadline results and updates the selected state", async () => {
    render(<DeadlineCalculator />);

    await userEvent.selectOptions(screen.getByLabelText("Your state"), "Gujarat");
    expect(
      screen.getByRole("link", { name: "Register on your state election commission site" })
    ).toHaveAttribute(
      "href",
      "https://ceogujarat.nic.in"
    );
  });
});
