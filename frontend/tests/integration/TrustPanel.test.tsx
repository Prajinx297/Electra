import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrustPanel } from "../../src/features/trust/TrustPanel";
import { flagSourceAsOutdated } from "../../src/firebase/firestore";

vi.mock("../../src/firebase/firestore", () => ({
  flagSourceAsOutdated: vi.fn().mockResolvedValue(undefined)
}));

describe("TrustPanel", () => {
  it("shows provenance and flags outdated sources", async () => {
    render(<TrustPanel sessionId="session-1" trust={undefined} />);

    await userEvent.click(screen.getByText("How do we know this?"));
    expect(screen.getByText("Voting and elections")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Flag as outdated" }));
    await waitFor(() => expect(flagSourceAsOutdated).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "session-1", sourceId: "usa-gov-voting" })
    ));
  });

  it("is collapsed by default, expands on demand, and renders confidence percentage", async () => {
    const { container } = render(<TrustPanel sessionId="session-1" trust={undefined} />);

    expect(container.querySelector("details")).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("How do we know this?"));
    expect(screen.getByText("Voting and elections")).toBeInTheDocument();
    expect(screen.getByText(/Confidence: 82%/)).toBeInTheDocument();
  });
});
