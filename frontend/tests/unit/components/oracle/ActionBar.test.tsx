import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionBar } from "../../../../src/components/oracle/ActionBar";

describe("ActionBar", () => {
  it("renders primary and secondary actions with accessible names", async () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();

    render(
      <ActionBar
        primaryAction={{ label: "Continue", action: "continue" }}
        secondaryAction={{ label: "Tell me more", action: "more" }}
        progressLabel="Registration"
        busy={false}
        onPrimary={onPrimary}
        onSecondary={onSecondary}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Tell me more" }));
    await userEvent.click(screen.getByRole("button", { name: /Continue.*Registration/i }));
    expect(onSecondary).toHaveBeenCalled();
    expect(onPrimary).toHaveBeenCalled();
  });

  it("disables the primary action while busy", () => {
    render(
      <ActionBar
        primaryAction={{ label: "Continue", action: "continue" }}
        secondaryAction={null}
        progressLabel="Registration"
        busy
        onPrimary={vi.fn()}
        onSecondary={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /Continue.*Registration/i })).toBeDisabled();
    expect(screen.getByText("Working on it...")).toBeInTheDocument();
  });
});
