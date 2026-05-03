import type { OracleRequest, OracleResponse, OracleStreamChunk, TrustMetadata } from '../types';
import {
  buildOracleRequestInit,
  createOracleTimeout,
  oracleResponseToStreamChunk,
  parseOracleStreamChunk,
} from '../utils/oracleTransport';

const RETRY_DELAYS_MS = [250, 750];

const wait = (delayMs: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

// ts-prune-ignore-next
export const requestOracle = async (
  payload: OracleRequest,
  token?: string | null,
  signal?: AbortSignal,
): Promise<OracleResponse> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const timeout = createOracleTimeout(signal);

    try {
      const response = await fetch(
        '/api/oracle',
        buildOracleRequestInit(payload, token, timeout.signal),
      );

      if (!response.ok) {
        throw new Error(`Oracle request failed with ${response.status}`);
      }

      return (await response.json()) as OracleResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Oracle request failed');
      if (attempt < RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[attempt] ?? 0);
      }
    } finally {
      timeout.clear();
    }
  }

  throw lastError ?? new Error('Oracle request failed');
};

const buildStreamFallbackResponse = (
  payload: OracleRequest,
  message: string,
  trust?: TrustMetadata,
): OracleResponse => ({
  message,
  tone: 'informative',
  render: null,
  renderProps: {},
  primaryAction: {
    label: 'Keep going',
    action: 'continue',
  },
  secondaryAction: null,
  progress: {
    step: 1,
    total: 1,
    label: 'Oracle response',
  },
  proactiveWarning: null,
  stateTransition: payload.currentState,
  cognitiveLevel: payload.cognitiveLevel,
  nextAnticipated: null,
  confidence: trust?.confidence ?? 0.9,
  trust,
});

async function* streamOracleChunks(
  payload: OracleRequest,
  signal?: AbortSignal,
  token?: string | null,
): AsyncGenerator<OracleStreamChunk> {
  const timeout = createOracleTimeout(signal);
  let rawBuffer = '';
  let lineBuffer = '';
  let sawStructuredChunk = false;

  try {
    const response = await fetch(
      '/api/oracle/stream',
      buildOracleRequestInit(payload, token, timeout.signal),
    );

    if (!response.ok || !response.body) {
      const fallback = await requestOracle(payload, token, signal);
      yield oracleResponseToStreamChunk(fallback);
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
          const parsed = parseOracleStreamChunk(line);
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
        const parsed = parseOracleStreamChunk(lineBuffer);
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
      yield oracleResponseToStreamChunk(fallback);
    }
  } finally {
    timeout.clear();
  }
}

const streamOracleLegacy = async (
  payload: OracleRequest,
  onToken: (token: string) => void,
  token?: string | null,
  signal?: AbortSignal,
) => {
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

  return finalResponse ?? buildStreamFallbackResponse(payload, text, finalTrust);
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
/**
 * Streams Oracle responses either as chunks or through the legacy token callback API.
 *
 * @param payload - Civic journey request sent to the Oracle service
 * @param signalOrHandler - Abort signal for chunk streaming, or token callback for legacy callers
 * @param token - Optional bearer token used for authenticated Oracle requests
 * @param signal - Optional abort signal used by legacy callback callers
 * @returns Async chunks for modern callers, or a resolved Oracle response for callback callers
 */
export function streamOracle(
  payload: OracleRequest,
  signalOrHandler?: AbortSignal | ((token: string) => void),
  token?: string | null,
  signal?: AbortSignal,
) {
  if (typeof signalOrHandler === 'function') {
    return streamOracleLegacy(payload, signalOrHandler, token, signal);
  }

  return streamOracleChunks(payload, signalOrHandler, token);
}
