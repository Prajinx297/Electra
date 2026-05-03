import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BallotWalkthrough from "../../../../src/components/simulations/BallotWalkthrough";

describe("BallotWalkthrough", () => {
  it("renders ballot ingestion stages and advances", async () => {
    render(<BallotWalkthrough />);

    expect(screen.getByText("Arrive at your polling booth")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByText("Identity verification by Presiding Officer")).toBeInTheDocument();
  });
});
