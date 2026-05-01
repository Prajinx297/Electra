import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import JourneySummary from "../../../../src/components/shared/JourneySummary";

describe("JourneySummary", () => {
  it("renders completion copy", () => {
    render(<JourneySummary />);

    expect(screen.getByText("You are ready")).toBeInTheDocument();
    expect(screen.getByText(/officially know your next voting step/i)).toBeInTheDocument();
  });
});
