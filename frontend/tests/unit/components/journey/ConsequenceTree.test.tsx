import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ConsequenceTree from "../../../../src/components/journey/ConsequenceTree";

describe("ConsequenceTree", () => {
  it("renders the best path and graph surface", () => {
    render(
      <ConsequenceTree
        affects={["Regular ballot path"]}
        recoveryPaths={["Ask for a backup ballot"]}
        bestPath="Ask before you leave."
      />
    );

    expect(screen.getByText("What this affects")).toBeInTheDocument();
    expect(screen.getByText("Ask before you leave.")).toBeInTheDocument();
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });
});
