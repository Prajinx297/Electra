import type { OracleRequest, OracleResponse, OracleStreamChunk, TrustMetadata } from "../types";

const ORACLE_TIMEOUT_MS = 12000;
const RETRY_DELAYS_MS = [250, 750];

interface ApiOracleRequest {
  message: string;
  currentState: string;
  stateHistory: OracleRequest["history"];
  cognitiveLevel: string;
  language: string;
  sessionId?: string;
  profile?: OracleRequest["profile"];
}

const wait = (delayMs: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const withTimeout = (signal?: AbortSignal) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ORACLE_TIMEOUT_MS);

  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timer)
  };
};

const toApiPayload = (payload: OracleRequest): ApiOracleRequest => ({
  message: payload.userMessage,
  currentState: payload.currentState,
  stateHistory: payload.history,
  cognitiveLevel: payload.cognitiveLevel,
  language: payload.language,
  sessionId: payload.sessionId,
  profile: payload.profile
});

export const requestOracle = async (
  payload: OracleRequest,
  token?: string | null,
  signal?: AbortSignal
): Promise<OracleResponse> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const timeout = withTimeout(signal);

    try {
      const response = await fetch("/api/oracle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(toApiPayload(payload)),
        signal: timeout.signal
      });

      if (!response.ok) {
        throw new Error(`Oracle request failed with ${response.status}`);
      }

      return (await response.json()) as OracleResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Oracle request failed");
      if (attempt < RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[attempt]);
      }
    } finally {
      timeout.clear();
    }
  }

  throw lastError ?? new Error("Oracle request failed");
};

const parseStructuredChunk = (line: string): OracleStreamChunk | null => {
  const normalized = line.trim().startsWith("data:")
    ? line.trim().slice(5).trim()
    : line.trim();

  if (!normalized || normalized === "[DONE]") {
    return null;
  }

  const parsed = JSON.parse(normalized) as Partial<OracleStreamChunk> & Partial<OracleResponse>;

  if (typeof parsed.delta === "string") {
    return parsed as OracleStreamChunk;
  }

  if (typeof parsed.message === "string") {
    const response = parsed as OracleResponse;
    return {
      delta: response.message,
      done: true,
      trust: response.trust,
      response
    };
  }

  return null;
};

const buildStreamFallbackResponse = (
  payload: OracleRequest,
  message: string,
  trust?: TrustMetadata
): OracleResponse => ({
  message,
  tone: "informative",
  render: null,
  renderProps: {},
  primaryAction: {
    label: "Keep going",
    action: "continue"
  },
  secondaryAction: null,
  progress: {
    step: 1,
    total: 1,
    label: "Oracle response"
  },
  proactiveWarning: null,
  stateTransition: payload.currentState,
  cognitiveLevel: payload.cognitiveLevel,
  nextAnticipated: null,
  confidence: trust?.confidence,
  trust
});

async function* streamOracleChunks(
  payload: OracleRequest,
  signal?: AbortSignal,
  token?: string | null
): AsyncGenerator<OracleStreamChunk> {
  const timeout = withTimeout(signal);
  let rawBuffer = "";
  let lineBuffer = "";
  let sawStructuredChunk = false;

  try {
    const response = await fetch("/api/oracle/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(toApiPayload(payload)),
      signal: timeout.signal
    });

    if (!response.ok || !response.body) {
      const fallback = await requestOracle(payload, token, signal);
      yield {
        delta: fallback.message,
        done: true,
        trust: fallback.trust,
        response: fallback
      };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      rawBuffer += chunk;
      lineBuffer += chunk;

      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        try {
          const parsed = parseStructuredChunk(line);
          if (parsed) {
            sawStructuredChunk = true;
            yield parsed;
          }
        } catch {
          // Ignore incomplete non-NDJSON fragments; they are handled as a final JSON fallback.
        }
      }
    }

    if (lineBuffer.trim()) {
      try {
        const parsed = parseStructuredChunk(lineBuffer);
        if (parsed) {
          sawStructuredChunk = true;
          yield parsed;
        }
      } catch {
        // Fall through to raw JSON parsing.
      }
    }

    if (!sawStructuredChunk && rawBuffer.trim()) {
      const fallback = JSON.parse(rawBuffer) as OracleResponse;
      yield {
        delta: fallback.message,
        done: true,
        trust: fallback.trust,
        response: fallback
      };
    }
  } finally {
    timeout.clear();
  }
}

const streamOracleLegacy = async (
  payload: OracleRequest,
  onToken: (token: string) => void,
  token?: string | null,
  signal?: AbortSignal
) => {
  let text = "";
  let finalResponse: OracleResponse | null = null;
  let finalTrust: TrustMetadata | undefined;

  for await (const chunk of streamOracleChunks(payload, signal, token)) {
    if (chunk.delta) {
      text += chunk.delta;
      onToken(chunk.delta);
    }
    if (chunk.trust) {
      finalTrust = chunk.trust;
    }
    if (chunk.response) {
      finalResponse = chunk.response;
    }
  }

  return finalResponse ?? buildStreamFallbackResponse(payload, text, finalTrust);
};

export function streamOracle(
  payload: OracleRequest,
  signal?: AbortSignal,
  token?: string | null
): AsyncGenerator<OracleStreamChunk>;
export function streamOracle(
  payload: OracleRequest,
  onToken: (token: string) => void,
  token?: string | null,
  signal?: AbortSignal
): Promise<OracleResponse>;
export function streamOracle(
  payload: OracleRequest,
  signalOrHandler?: AbortSignal | ((token: string) => void),
  token?: string | null,
  signal?: AbortSignal
) {
  if (typeof signalOrHandler === "function") {
    return streamOracleLegacy(payload, signalOrHandler, token, signal);
  }

  return streamOracleChunks(payload, signalOrHandler, token);
}
