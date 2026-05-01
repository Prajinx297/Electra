import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestOracle, streamOracle } from "../../src/engines/oracleClient";
import type { OracleRequest, OracleResponse } from "../../src/types";

const oracleResponse: OracleResponse = {
  message: "Check your registration.",
  tone: "informative",
  render: "RegistrationChecker",
  renderProps: {},
  primaryAction: { label: "Check", action: "check_registration" },
  secondaryAction: null,
  progress: { step: 2, total: 7, label: "Registration" },
  proactiveWarning: null,
  stateTransition: "REGISTRATION_CHECK",
  cognitiveLevel: "citizen",
  nextAnticipated: "DeadlineCalculator",
  trust: {
    sources: [
      {
        id: "eci-gov-voting",
        title: "Voting and elections",
        publisher: "ECI",
        url: "https://www.eci.gov.in",
        lastVerified: "2026-04-30"
      }
    ],
    confidence: 0.91,
    lastVerified: "2026-04-30",
    rationale: "Official voting guidance."
  }
};

const requestPayload: OracleRequest = {
  userMessage: "What do I do next?",
  currentState: "WELCOME",
  history: [],
  cognitiveLevel: "citizen",
  language: "en",
  sessionId: "session-1"
};

const responseFrom = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body)
});

describe("oracleClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requestOracle sends the expected API payload and auth header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(responseFrom(oracleResponse));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await requestOracle(requestPayload, "firebase-token");

    expect(result.trust).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/oracle",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer firebase-token"
        }),
        body: JSON.stringify({
          message: "What do I do next?",
          currentState: "WELCOME",
          stateHistory: [],
          cognitiveLevel: "citizen",
          language: "en",
          sessionId: "session-1"
        })
      })
    );
  });

  it("passes an AbortSignal so the timeout wrapper can cancel slow requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(responseFrom(oracleResponse));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await requestOracle(requestPayload);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/oracle",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("throws an Oracle request error after failed responses", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(responseFrom({ detail: "nope" }, false, 500));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const pending = requestOracle(requestPayload);
    const rejection = expect(pending).rejects.toThrow("Oracle request failed with 500");
    await vi.runAllTimersAsync();

    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("streamOracle yields chunks in order and returns the parsed final response", async () => {
    const encoded = JSON.stringify(oracleResponse);
    const chunks = [encoded.slice(0, 24), encoded.slice(24, 71), encoded.slice(71)];
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      }
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body }) as unknown as typeof fetch;
    const onToken = vi.fn();

    const result = await streamOracle(requestPayload, onToken, "firebase-token");

    expect(onToken.mock.calls.map(([chunk]) => chunk)).toEqual(["Check your registration."]);
    expect(result.trust).toBeDefined();
    expect(result.message).toBe("Check your registration.");
  });

  it("falls back to requestOracle when streaming is unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, body: null })
      .mockResolvedValueOnce(responseFrom(oracleResponse));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await streamOracle(requestPayload, vi.fn());

    expect(result.message).toBe("Check your registration.");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/oracle", expect.any(Object));
  });
});
