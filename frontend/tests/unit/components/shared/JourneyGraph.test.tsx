import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import JourneyGraph from "../../../../src/components/shared/JourneyGraph";
import { useElectraStore } from "../../../../src/engines/stateEngine";

describe("JourneyGraph", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
  });

  it("renders a graph for recent journey history", () => {
    render(<JourneyGraph />);

    expect(screen.getByText("Your path so far")).toBeInTheDocument();
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });
});
