import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import WelcomeStep from "../../../../src/components/shared/WelcomeStep";

describe("WelcomeStep", () => {
  it("renders custom welcome copy", () => {
    render(<WelcomeStep title="Start here" description="One step at a time." />);

    expect(screen.getByRole("heading", { name: "Start here" })).toBeInTheDocument();
    expect(screen.getByText("One step at a time.")).toBeInTheDocument();
  });
});
