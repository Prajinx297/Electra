import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContextPanel } from "../../../../src/components/layout/ContextPanel";

describe("ContextPanel", () => {
  it("renders summary, warning, confidence, and prediction hit status", () => {
    render(
      <ContextPanel
        language="en"
        summary="Bring ID before you leave."
        warning="Deadline is close."
        confidence={0.87}
        predictionHit
      />
    );

    expect(screen.getByText("What this means for you")).toBeInTheDocument();
    expect(screen.getByText("Deadline is close.")).toBeInTheDocument();
    expect(screen.getByText("87% certain about this step.")).toBeInTheDocument();
    expect(screen.getByText("Loaded instantly. Oracle predicted this.")).toBeInTheDocument();
  });
});
