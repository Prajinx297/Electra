import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OracleMessage } from "../../../../src/components/oracle/OracleMessage";

describe("OracleMessage", () => {
  it("announces the oracle response through an accessible label", () => {
    vi.useFakeTimers();
    render(<OracleMessage message="Bring your ID." tone="informative" />);

    expect(screen.getByLabelText(/Tone: informative/i)).toBeInTheDocument();
    vi.runAllTimers();
    expect(screen.getByText("Bring your ID.")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
