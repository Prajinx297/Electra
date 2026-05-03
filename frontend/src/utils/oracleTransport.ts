import type { OracleRequest, OracleResponse, OracleStreamChunk } from '../types';

const ORACLE_TIMEOUT_MS = 12_000;

interface ApiOracleRequest {
  message: string;
  currentState: string;
  stateHistory: OracleRequest['history'];
  cognitiveLevel: string;
  language: string;
  sessionId?: string | undefined;
  profile?: OracleRequest['profile'] | undefined;
}

export const createOracleTimeout = (
  signal?: AbortSignal,
  timeoutMs = ORACLE_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timer),
  };
};

const toOracleApiPayload = (payload: OracleRequest): ApiOracleRequest => ({
  message: payload.userMessage,
  currentState: payload.currentState,
  stateHistory: payload.history,
  cognitiveLevel: payload.cognitiveLevel,
  language: payload.language,
  sessionId: payload.sessionId,
  profile: payload.profile,
});

export const buildOracleRequestInit = (
  payload: OracleRequest,
  token: string | null | undefined,
  signal: AbortSignal,
): RequestInit => ({
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(toOracleApiPayload(payload)),
  signal,
});

export const oracleResponseToStreamChunk = (
  response: OracleResponse,
): OracleStreamChunk => ({
  delta: response.message,
  done: true,
  trust: response.trust,
  response,
});

export const parseOracleStreamChunk = (line: string): OracleStreamChunk | null => {
  const normalized = line.trim().startsWith('data:') ? line.trim().slice(5).trim() : line.trim();

  if (!normalized || normalized === '[DONE]') {
    return null;
  }

  const parsed = JSON.parse(normalized) as Partial<OracleStreamChunk> & Partial<OracleResponse>;

  if (typeof parsed.delta === 'string') {
    return parsed as OracleStreamChunk;
  }

  if (typeof parsed.message === 'string') {
    return oracleResponseToStreamChunk(parsed as OracleResponse);
  }

  return null;
};
