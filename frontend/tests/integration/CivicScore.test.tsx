import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CivicScoreCard } from "../../src/features/civic-score/CivicScoreCard";

vi.mock("../../src/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => true
}));

describe("CivicScore integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 })) as unknown as typeof fetch;
  });

  it("increments score, unlocks a badge, and renders the share card", async () => {
    window.localStorage.setItem(
      "electra:civic-score",
      JSON.stringify({
        score: 40,
        badges: [],
        streakDays: 3,
        highestBadge: null
      })
    );

    render(<CivicScoreCard open onClose={vi.fn()} />);

    expect(screen.getByLabelText(/40 civic points/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Share your Civic Score/i }));

    expect(await screen.findByLabelText(/60 civic points/i)).toBeInTheDocument();
    expect(screen.getByText(/Badge unlocked: Civic Newcomer/i)).toBeInTheDocument();
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(screen.getByText(/I'm an informed voter - powered by ELECTRA/i)).toBeInTheDocument();
  });
});
