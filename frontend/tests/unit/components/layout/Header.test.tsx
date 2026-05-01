import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../../../../src/components/layout/Header";

describe("Header", () => {
  it("renders user state and supports sign-in and language changes", async () => {
    const onLanguageChange = vi.fn();
    const onSignIn = vi.fn().mockResolvedValue(undefined);
    const onVisualizerToggle = vi.fn();
    const onSimulatorOpen = vi.fn();
    const onScoreOpen = vi.fn();

    render(
      <Header
        language="en"
        userLabel="Guest mode"
        visualizerEnabled
        visualizerOpen
        simulatorEnabled
        scoreEnabled
        score={75}
        onLanguageChange={onLanguageChange}
        onVisualizerToggle={onVisualizerToggle}
        onSimulatorOpen={onSimulatorOpen}
        onScoreOpen={onScoreOpen}
        onSignIn={onSignIn}
      />
    );

    expect(screen.getByText("ELECTRA")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Journey" }));
    await userEvent.click(screen.getByRole("button", { name: "Simulator" }));
    await userEvent.click(screen.getByRole("button", { name: "75 pts" }));
    await userEvent.click(screen.getByRole("button", { name: "ES" }));
    await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

    expect(onVisualizerToggle).toHaveBeenCalled();
    expect(onSimulatorOpen).toHaveBeenCalled();
    expect(onScoreOpen).toHaveBeenCalled();
    expect(onLanguageChange).toHaveBeenCalledWith("es");
    expect(onSignIn).toHaveBeenCalled();
  });
});
