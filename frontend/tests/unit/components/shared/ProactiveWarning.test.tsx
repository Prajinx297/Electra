import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProactiveWarning } from "../../../../src/components/shared/ProactiveWarning";

describe("ProactiveWarning", () => {
  it("renders a status message", () => {
    render(<ProactiveWarning message="Deadline is close." />);

    expect(screen.getByRole("status")).toHaveTextContent("Deadline is close.");
  });
});
