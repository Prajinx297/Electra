import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "../../../../src/components/layout/AppShell";
import { useElectraStore } from "../../../../src/engines/stateEngine";

describe("AppShell", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
  });

  it("renders navigation items and exposes skip-to-main control", async () => {
    const onAsk = vi.fn().mockResolvedValue(undefined);
    render(
      <AppShell
        userLabel="Guest mode"
        busy={false}
        onAsk={onAsk}
        onPrimaryAction={vi.fn()}
        onSecondaryAction={vi.fn()}
        onLanguageChange={vi.fn()}
        onCognitiveLevelChange={vi.fn()}
        onSignIn={vi.fn().mockResolvedValue(undefined)}
        demoAnnotation={null}
      />
    );

    expect(screen.getByRole("button", { name: "Skip to main content" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ask this question" }));
    expect(onAsk).not.toHaveBeenCalled();
  });
});
