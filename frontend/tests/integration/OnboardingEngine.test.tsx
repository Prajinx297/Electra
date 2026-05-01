import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { OnboardingEngine } from "../../src/features/onboarding/OnboardingEngine";
import { useElectraStore } from "../../src/engines/stateEngine";

describe("OnboardingEngine", () => {
  it("collects location, familiarity, and access needs", async () => {
    const onComplete = vi.fn();
    render(<OnboardingEngine onComplete={onComplete} />);

    await userEvent.type(screen.getByPlaceholderText("Atlanta, GA"), "Phoenix, AZ");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "confident" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Mobility" }));
    await userEvent.click(screen.getByRole("button", { name: "Enter Electra" }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "Phoenix, AZ",
        familiarity: "confident",
        accessibilityNeeds: ["Mobility"],
        toneMode: "policy-expert"
      })
    );
  });

  it("sets confident familiarity to policy-expert and persists accessibility needs in the profile", async () => {
    const onComplete = vi.fn();
    render(<OnboardingEngine onComplete={onComplete} />);

    await userEvent.type(screen.getByPlaceholderText("Atlanta, GA"), "Madison, WI");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "confident" }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(screen.getByRole("button", { name: "Vision" }));
    await userEvent.click(screen.getByRole("button", { name: "Language" }));
    await userEvent.click(screen.getByRole("button", { name: "Enter Electra" }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        toneMode: "policy-expert",
        accessibilityNeeds: ["Vision", "Language"]
      })
    );
  });

  it("blocks the main app until onboarding is complete", () => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    render(<App />);

    expect(screen.getByText("Electra intake")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ask a question")).not.toBeInTheDocument();
  });
});
