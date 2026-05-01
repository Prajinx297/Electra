import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminPanel } from "../../../../src/components/layout/AdminPanel";
import { useElectraStore } from "../../../../src/engines/stateEngine";

describe("AdminPanel", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
  });

  it("renders the confusion heatmap view", () => {
    render(<AdminPanel />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText("Confusion heatmap")).toBeInTheDocument();
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });
});
