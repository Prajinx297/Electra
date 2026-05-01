import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, type Mock } from "vitest";
import { StreamingOraclePanel } from "../../src/features/streaming/StreamingOraclePanel";
import { streamOracle } from "../../src/engines/oracleClient";
import type { OracleRequest, OracleResponse, OracleStreamChunk, TrustMetadata } from "../../src/types";

vi.mock("../../src/engines/oracleClient", () => ({
  streamOracle: vi.fn()
}));

const streamOracleMock = streamOracle as unknown as Mock;

vi.mock("../../src/firebase/performance", () => ({
  measureStreamingLatency: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    putMetric: vi.fn()
  })
}));

const request: OracleRequest = {
  userMessage: "Where do I vote?",
  currentState: "POLLING_FINDER",
  history: [],
  cognitiveLevel: "citizen",
  language: "en",
  sessionId: "session-1"
};

const trust: TrustMetadata = {
  confidence: 0.91,
  lastVerified: "2026-04-30",
  rationale: "Official polling-place guidance.",
  sources: [
    {
      id: "usa-gov-voting",
      title: "Voting and elections",
      publisher: "USAGov",
      url: "https://www.usa.gov/voting",
      lastVerified: "2026-04-30"
    }
  ]
};

const response: OracleResponse = {
  message: "Vote at your polling place",
  tone: "informative",
  render: null,
  renderProps: {},
  primaryAction: { label: "Keep going", action: "continue" },
  secondaryAction: null,
  progress: { step: 1, total: 1, label: "Oracle response" },
  proactiveWarning: null,
  stateTransition: "POLLING_FINDER",
  cognitiveLevel: "citizen",
  nextAnticipated: null,
  confidence: 0.91,
  trust
};

describe("StreamingOracle integration", () => {
  it("builds token text, exposes streaming controls, and attaches trust metadata", async () => {
    let releaseFinalChunk!: () => void;
    async function* chunks(): AsyncGenerator<OracleStreamChunk> {
      yield { delta: "Vote" };
      await new Promise<void>((resolve) => {
        releaseFinalChunk = resolve;
      });
      yield { delta: " at" };
      yield { delta: " your polling place" };
      yield { delta: "", done: true, trust, response };
    }

    streamOracleMock.mockReturnValue(chunks());

    render(
      <StreamingOraclePanel
        request={request}
        sessionId="session-1"
        onComplete={vi.fn()}
      />
    );

    expect(await screen.findByText(/Vote/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop generating/i })).toBeInTheDocument();
    await waitFor(() => expect(releaseFinalChunk).toEqual(expect.any(Function)));

    releaseFinalChunk();

    expect(await screen.findByText(/Vote at your polling place/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /stop generating/i })).not.toBeInTheDocument()
    );
    expect(screen.getByText(/How do we know this/i)).toBeInTheDocument();
  });

  it("keeps partial text when stopped and offers retry after interruption", async () => {
    let resume!: () => void;
    async function* interruptedChunks(): AsyncGenerator<OracleStreamChunk> {
      yield { delta: "Partial" };
      await new Promise<void>((resolve) => {
        resume = resolve;
      });
      throw new Error("network broke");
    }

    async function* retryChunks(): AsyncGenerator<OracleStreamChunk> {
      yield { delta: "Recovered" };
      yield { delta: "", done: true, trust, response: { ...response, message: "Recovered" } };
    }

    streamOracleMock
      .mockReturnValueOnce(interruptedChunks())
      .mockReturnValueOnce(retryChunks());
    const onError = vi.fn();

    render(
      <StreamingOraclePanel
        request={request}
        sessionId="session-1"
        onError={onError}
      />
    );

    expect(await screen.findByText(/Partial/i)).toBeInTheDocument();
    await waitFor(() => expect(resume).toEqual(expect.any(Function)));

    resume();

    expect(await screen.findByText(/\[Response interrupted\]/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith("network broke");

    await screen.getByRole("button", { name: /Retry/i }).click();
    expect(await screen.findByText(/Recovered/i)).toBeInTheDocument();
  });
});
