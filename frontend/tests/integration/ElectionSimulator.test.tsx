import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ElectionSimulator } from "../../src/features/simulator/ElectionSimulator";

vi.mock("../../src/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => true
}));

vi.mock("../../src/features/streaming/StreamingOraclePanel", () => ({
  StreamingOraclePanel: () => <aside>Civic narration stream</aside>
}));

vi.mock("../../src/firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/firebase/firestore")>();
  return {
    ...actual,
    persistSimulationState: vi.fn().mockResolvedValue(undefined)
  };
});

describe("ElectionSimulator integration", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const path = String(url);
      if (path.includes("/ingest")) {
        return new Response(JSON.stringify({
          serial: "EL-TEST123",
          precinct: "PCT-014",
          timestamp: "2026-05-01T00:00:00Z",
          encryptedPayload: "010101",
          signature: "signed"
        }), { status: 200 });
      }
      if (path.includes("/tally")) {
        return new Response(JSON.stringify({
          totalVotes: 13842,
          precinctsReporting: 88,
          confidenceInterval: 4.8,
          anomalyInjected: true,
          totals: [
            { candidate: "Rivera", votes: 6100 },
            { candidate: "Chen", votes: 6722 },
            { candidate: "Patel", votes: 1020 }
          ],
          affectedPrecinct: "PCT-044"
        }), { status: 200 });
      }
      if (path.includes("/certify")) {
        return new Response(JSON.stringify({
          certifiedAt: "2026-05-01T00:00:00Z",
          certificateId: "CERT-TEST",
          provenanceChain: ["Precinct frames", "County canvass", "State ledger"],
          summary: "Certification complete."
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        ballotsSampled: 312,
        machineCount: 187,
        handCount: 186,
        discrepancy: 1,
        recommendation: "Escalate to chain-of-custody review."
      }), { status: 200 });
    }) as unknown as typeof fetch;
  });

  it("covers ingestion, tallying, certification, anomaly warnings, and audit report flow", async () => {
    render(<ElectionSimulator onClose={vi.fn()} />);

    expect(screen.getByText(/Ballot Design & Ingestion/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Submit Ballot/i }));
    expect(await screen.findByText(/Live tally/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Inject Anomaly/i }));
    expect(await screen.findByText(/Confidence interval warning in PCT-044/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continue to canvass/i }));
    expect(await screen.findByText(/Canvass checklist/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Certify Election/i }));
    expect(await screen.findByText(/Post-Election Audit/i)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /Run Audit/i }));
    await waitFor(() => expect(screen.getByText(/Escalate to chain-of-custody review/i)).toBeInTheDocument());
  });
});
