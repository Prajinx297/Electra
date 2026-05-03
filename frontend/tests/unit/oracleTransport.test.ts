import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildOracleRequestInit,
  createOracleTimeout,
  oracleResponseToStreamChunk,
  parseOracleStreamChunk
} from "../../src/utils/oracleTransport";
import { CognitiveLevel, RenderKey } from "../../src/types";
import type { OracleRequest, OracleResponse } from "../../src/types";

const request: OracleRequest = {
  userInput: "How do I vote?",
  userMessage: "How do I vote?",
  currentState: "WELCOME",
  cognitiveLevel: CognitiveLevel.Simple,
  sessionId: "session-1",
  journeyHistory: [],
  history: [],
  locale: "en",
  language: "en"
};

const response: OracleResponse = {
  renderKey: RenderKey.Form,
  explanation: "Check your booth.",
  componentProps: {},
  predictedNextKeys: [RenderKey.Map],
  civicScoreDelta: 5,
  confidence: 0.91,
  message: "Check your booth.",
  tone: "informative",
  render: RenderKey.Form,
  renderProps: {},
  primaryAction: { label: "Next", action: "next" },
  secondaryAction: null,
  progress: { step: 1, total: 1, label: "Voting" },
  proactiveWarning: null,
  stateTransition: "REGISTRATION_FLOW",
  cognitiveLevel: CognitiveLevel.Simple,
  nextAnticipated: RenderKey.Map
};

describe("oracle transport helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds authenticated API request init", () => {
    const timeout = createOracleTimeout(undefined, 1_000);
    const init = buildOracleRequestInit(request, "firebase-token", timeout.signal);
    const headers = init.headers as Record<string, string>;

    expect(init.method).toBe("POST");
    expect(headers.Authorization).toBe("Bearer firebase-token");
    expect(JSON.parse(String(init.body))).toMatchObject({
      message: "How do I vote?",
      currentState: "WELCOME",
      sessionId: "session-1"
    });
    timeout.clear();
  });

  it("aborts on external abort and timeout", () => {
    vi.useFakeTimers();
    const externalController = new AbortController();
    const linkedTimeout = createOracleTimeout(externalController.signal, 100);
    externalController.abort();
    expect(linkedTimeout.signal.aborted).toBe(true);
    linkedTimeout.clear();

    const timerTimeout = createOracleTimeout(undefined, 100);
    vi.advanceTimersByTime(100);
    expect(timerTimeout.signal.aborted).toBe(true);
    timerTimeout.clear();
  });

  it("converts final responses into stream chunks", () => {
    expect(oracleResponseToStreamChunk(response)).toMatchObject({
      delta: "Check your booth.",
      done: true,
      response
    });
  });

  it("parses structured stream lines", () => {
    expect(parseOracleStreamChunk("")).toBeNull();
    expect(parseOracleStreamChunk("data: [DONE]")).toBeNull();
    expect(parseOracleStreamChunk('data: {"delta":"Vote"}')).toMatchObject({ delta: "Vote" });
    expect(parseOracleStreamChunk(JSON.stringify(response))).toMatchObject({
      delta: "Check your booth.",
      done: true
    });
    expect(parseOracleStreamChunk('{"event":"noop"}')).toBeNull();
  });
});
