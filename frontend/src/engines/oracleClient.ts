import type { OracleRequest, OracleResponse, OracleStreamChunk, TrustMetadata } from '../types';

/** Milliseconds before duplicated AbortControllers cancel hanging Oracle HTTP calls. */
const ORACLE_HTTP_TIMEOUT_MS = 12000;

/** Exponential backoff offsets applied between retried synchronous Oracle posts. */
const ORACLE_RETRY_BACKOFF_SCHEDULE_MS = [250, 750] as const;

/** Relative FastAPI path resolving synchronous Oracle completions used by the civic shell. */
const ORACLE_SYNC_API_PATH = '/api/oracle';

/** Relative FastAPI path exposing newline-delimited Oracle streaming payloads. */
const ORACLE_STREAM_API_PATH = '/api/oracle/stream';

/** Confidence injected into synthesized streaming responses lacking explicit Oracle metadata. */
const ORACLE_STREAM_FALLBACK_CONFIDENCE = 0.9;

/** Structured FastAPI payload bridging frontend Oracle requests with backend validators. */
interface ApiOracleRequest {
  cognitiveLevel: string;
  currentState: string;
  language: string;
  message: string;
  profile?: OracleRequest['profile'] | undefined;
  sessionId?: string | undefined;
  stateHistory: OracleRequest['history'];
}

/** Utilities returned alongside synthetic abort signals for cooperative HTTP cancellation. */
interface OracleTimeoutHandle {
  /** AbortSignal wired into fetch contracts so timeouts mirror user cancellations. */
  signal: AbortSignal;
  /** Clears pending timers once Oracle completions settle successfully. */
  clear: () => void;
}

/**
 * Suspends execution for deterministic backoff intervals between Oracle retries.
 *
 * @param delayMs - Milliseconds to defer continuation scheduling on the macrotask queue.
 * @returns Promise resolving once the delay elapses.
 */
const wait = (delayMs: number): Promise<void> =>
  new Promise((resolve: () => void) => {
    window.setTimeout(resolve, delayMs);
  });

/**
 * Composes an AbortSignal that fires after {@link ORACLE_HTTP_TIMEOUT_MS} unless cleared early.
 *
 * @param signal - Optional upstream abort scope propagated from orchestrators or UI cancels.
 * @returns Cooperative timeout controller exposing merged abort semantics for fetch calls.
 */
const createOracleTimeoutHandle = (signal?: AbortSignal): OracleTimeoutHandle => {
  const controller = new AbortController();
  const timer = window.setTimeout((): void => {
    controller.abort();
  }, ORACLE_HTTP_TIMEOUT_MS);

  signal?.addEventListener(
    'abort',
    (): void => {
      controller.abort();
    },
    { once: true },
  );

  return {
    clear: (): void => {
      window.clearTimeout(timer);
    },
    signal: controller.signal,
  };
};

/**
 * Maps strongly typed {@link OracleRequest} envelopes onto backend-compatible JSON payloads.
 *
 * @param payload - Civic orchestration payload describing learner dialogue context.
 * @returns Wire-format Oracle body understood by FastAPI validators.
 */
const toApiOraclePayload = (payload: OracleRequest): ApiOracleRequest => ({
  cognitiveLevel: payload.cognitiveLevel,
  currentState: payload.currentState,
  language: payload.language,
  message: payload.userMessage,
  profile: payload.profile,
  sessionId: payload.sessionId,
  stateHistory: payload.history,
});

/**
 * Performs resilient synchronous Oracle posts with bounded exponential backoff retries.
 *
 * @param payload - Fully hydrated civic Oracle envelope forwarded from orchestrators.
 * @param token - Optional Firebase bearer token enabling authenticated civic telemetry lanes.
 * @param signal - Optional upstream abort scope cancelling retried attempts cooperatively.
 * @returns Parsed Oracle JSON directing Agentic UI render targets.
 * @throws Error When every retry attempt exhausts without receiving structured Oracle JSON.
 */
export const requestOracle = async (
  payload: OracleRequest,
  token?: string | null,
  signal?: AbortSignal,
): Promise<OracleResponse> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= ORACLE_RETRY_BACKOFF_SCHEDULE_MS.length; attempt += 1) {
    const timeout = createOracleTimeoutHandle(signal);

    try {
      const response = await fetch(ORACLE_SYNC_API_PATH, {
        body: JSON.stringify(toApiOraclePayload(payload)),
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: 'POST',
        signal: timeout.signal,
      });

      if (!response.ok) {
        throw new Error(`Oracle request failed with ${String(response.status)}`);
      }

      return (await response.json()) as OracleResponse;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('Oracle request failed');
      if (attempt < ORACLE_RETRY_BACKOFF_SCHEDULE_MS.length) {
        await wait(ORACLE_RETRY_BACKOFF_SCHEDULE_MS[attempt] ?? 0);
      }
    } finally {
      timeout.clear();
    }
  }

  throw lastError ?? new Error('Oracle request failed');
};

/**
 * Parses newline-delimited streaming payloads coming from `/api/oracle/stream`.
 *
 * @param line - Raw NDJSON fragment emitted by civic SSE bridges.
 * @returns Parsed structured chunk or null when encountering heartbeat tokens.
 */
const parseStructuredStreamChunk = (line: string): OracleStreamChunk | null => {
  const normalized = line.trim().startsWith('data:') ? line.trim().slice(5).trim() : line.trim();

  if (!normalized || normalized === '[DONE]') {
    return null;
  }

  const parsed = JSON.parse(normalized) as Partial<OracleStreamChunk> & Partial<OracleResponse>;

  if (typeof parsed.delta === 'string') {
    return parsed as OracleStreamChunk;
  }

  if (typeof parsed.message === 'string') {
    const response = parsed as OracleResponse;
    return {
      delta: response.message,
      done: true,
      response,
      trust: response.trust,
    };
  }

  return null;
};

/**
 * Builds a deterministic Oracle payload when streaming terminates without structured metadata.
 *
 * @param payload - Original civic Oracle envelope providing continuity anchors.
 * @param message - Concatenated streaming transcript assembled across chunked deltas.
 * @param trust - Optional trust bundle inferred from partial structured chunks.
 * @returns Structured Oracle response satisfying downstream Agentic expectations.
 */
const buildStreamFallbackOracleResponse = (
  payload: OracleRequest,
  message: string,
  trust?: TrustMetadata,
): OracleResponse => ({
  cognitiveLevel: payload.cognitiveLevel,
  confidence: trust?.confidence ?? ORACLE_STREAM_FALLBACK_CONFIDENCE,
  message,
  nextAnticipated: null,
  primaryAction: {
    action: 'continue',
    label: 'Keep going',
  },
  proactiveWarning: null,
  progress: {
    label: 'Oracle response',
    step: 1,
    total: 1,
  },
  render: null,
  renderProps: {},
  secondaryAction: null,
  stateTransition: payload.currentState,
  tone: 'informative',
  trust,
});

/**
 * Streams Oracle NDJSON chunks while preserving cooperative cancellation semantics.
 *
 * @param payload - Civic dialogue envelope mirrored into streaming Oracle requests.
 * @param signal - Optional abort scope propagated from UI cancellations or timeouts.
 * @param token - Optional Firebase bearer token enabling authenticated streaming lanes.
 */
async function* streamOracleChunks(
  payload: OracleRequest,
  signal?: AbortSignal,
  token?: string | null,
): AsyncGenerator<OracleStreamChunk> {
  const timeout = createOracleTimeoutHandle(signal);
  let rawBuffer = '';
  let lineBuffer = '';
  let sawStructuredChunk = false;

  try {
    const response = await fetch(ORACLE_STREAM_API_PATH, {
      body: JSON.stringify(toApiOraclePayload(payload)),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      method: 'POST',
      signal: timeout.signal,
    });

    if (!response.ok || !response.body) {
      const fallback = await requestOracle(payload, token, signal);
      yield {
        delta: fallback.message,
        done: true,
        response: fallback,
        trust: fallback.trust,
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
      lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        try {
          const parsed = parseStructuredStreamChunk(line);
          if (parsed) {
            sawStructuredChunk = true;
            yield parsed;
          }
        } catch (_error: unknown) {
          // Incomplete NDJSON fragments are expected mid-stream; discard until buffers refill.
        }
      }
    }

    if (lineBuffer.trim()) {
      try {
        const parsed = parseStructuredStreamChunk(lineBuffer);
        if (parsed) {
          sawStructuredChunk = true;
          yield parsed;
        }
      } catch (_error: unknown) {
        // Fall through to consolidated JSON parsing below.
      }
    }

    if (!sawStructuredChunk && rawBuffer.trim()) {
      const fallback = JSON.parse(rawBuffer) as OracleResponse;
      yield {
        delta: fallback.message,
        done: true,
        response: fallback,
        trust: fallback.trust,
      };
    }
  } finally {
    timeout.clear();
  }
}

/**
 * Legacy streaming helper accumulating deltas before resolving a structured Oracle payload.
 *
 * @param payload - Civic envelope mirrored into streaming lanes.
 * @param onToken - Incremental delta callback powering optimistic UI rendering.
 * @param token - Optional Firebase bearer token authenticating streaming lanes.
 * @param signal - Cooperative cancellation wiring mirrored from orchestrators.
 * @returns Final structured Oracle response synthesized after iterator exhaustion.
 */
const streamOracleLegacy = async (
  payload: OracleRequest,
  onToken: (token: string) => void,
  token?: string | null,
  signal?: AbortSignal,
): Promise<OracleResponse> => {
  let text = '';
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

  return finalResponse ?? buildStreamFallbackOracleResponse(payload, text, finalTrust);
};

export function streamOracle(
  payload: OracleRequest,
  signal?: AbortSignal,
  token?: string | null,
): AsyncGenerator<OracleStreamChunk>;
export function streamOracle(
  payload: OracleRequest,
  onToken: (token: string) => void,
  token?: string | null,
  signal?: AbortSignal,
): Promise<OracleResponse>;
export function streamOracle(
  payload: OracleRequest,
  signalOrHandler?: AbortSignal | ((token: string) => void),
  token?: string | null,
  signal?: AbortSignal,
): AsyncGenerator<OracleStreamChunk> | Promise<OracleResponse> {
  if (typeof signalOrHandler === 'function') {
    return streamOracleLegacy(payload, signalOrHandler, token, signal);
  }

  return streamOracleChunks(payload, signalOrHandler, token);
}
