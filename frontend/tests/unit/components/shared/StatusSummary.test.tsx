import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusSummary from "../../../../src/components/shared/StatusSummary";

describe("StatusSummary", () => {
  it("renders title, description, and steps", () => {
    render(
      <StatusSummary
        title="Fix your registration"
        description="Try these steps."
        steps={["Check spelling", "Call your election office"]}
      />
    );

    expect(screen.getByText("Fix your registration")).toBeInTheDocument();
    expect(screen.getByText("Call your election office")).toBeInTheDocument();
  });
});
