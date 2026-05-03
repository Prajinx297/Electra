import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IDChecker from "../../../../src/components/simulations/IDChecker";

describe("IDChecker", () => {
  it("updates the ID result as answers change", async () => {
    render(<IDChecker />);

    await userEvent.click(
      screen.getByLabelText("I have an EPIC (Voter ID card) or another ECI-approved document")
    );
    await userEvent.click(
      screen.getByLabelText("My address in the document matches my constituency")
    );
    await userEvent.click(
      screen.getByLabelText("My document is issued by a government authority")
    );

    expect(
      screen.getByText("You are ready to vote. Your EPIC or approved document is sufficient.")
    ).toBeInTheDocument();
  });
});
