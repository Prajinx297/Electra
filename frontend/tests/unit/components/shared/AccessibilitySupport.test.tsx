import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AccessibilitySupport from "../../../../src/components/shared/AccessibilitySupport";

describe("AccessibilitySupport", () => {
  it("renders support cards for mobility, vision, and language help", () => {
    render(<AccessibilitySupport />);

    expect(screen.getByText("Choose the support you need")).toBeInTheDocument();
    expect(screen.getByText("Mobility help")).toBeInTheDocument();
    expect(screen.getByText("Low-vision help")).toBeInTheDocument();
    expect(screen.getByText("Language help")).toBeInTheDocument();
  });
});
