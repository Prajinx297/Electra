import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressDots } from "../../../../src/components/journey/ProgressDots";

describe("ProgressDots", () => {
  it("renders journey progress dots", () => {
    render(<ProgressDots step={2} total={5} />);

    expect(screen.getByLabelText("Journey progress").children).toHaveLength(5);
  });
});
