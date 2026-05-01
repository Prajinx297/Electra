import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidenceIndicator } from "../../../../src/components/shared/ConfidenceIndicator";

describe("ConfidenceIndicator", () => {
  it("renders rounded confidence percentage", () => {
    render(<ConfidenceIndicator confidence={0.824} />);

    expect(screen.getByText("82% certain about this step.")).toBeInTheDocument();
  });
});
