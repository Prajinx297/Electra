import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CognitiveLevelToggle } from "../../../../src/components/shared/CognitiveLevelToggle";

describe("CognitiveLevelToggle", () => {
  it("changes toneMode and exposes pressed state through disabled behavior", async () => {
    const onChange = vi.fn();
    render(<CognitiveLevelToggle value="citizen" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Policy expert" }));
    expect(onChange).toHaveBeenCalledWith("policy-expert");
    expect(screen.getByRole("button", { name: "Citizen" })).toBeEnabled();
  });
});
