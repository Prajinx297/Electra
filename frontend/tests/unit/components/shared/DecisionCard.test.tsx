import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DecisionCard from "../../../../src/components/shared/DecisionCard";

describe("DecisionCard", () => {
  it("renders custom title, description, and bullet list", () => {
    render(
      <DecisionCard
        title="Bring these things"
        description="Pack before you leave."
        bullets={["Photo ID", "Address proof"]}
      />
    );

    expect(screen.getByText("Bring these things")).toBeInTheDocument();
    expect(screen.getByText("Photo ID")).toBeInTheDocument();
    expect(screen.getByText("Address proof")).toBeInTheDocument();
  });
});
