import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { logger } from '@/lib/logger';

import { streamOracle } from '../../engines/oracleClient';
import { civicBus } from '../../events/civicEventBus';
import { measureStreamingLatency } from '../../firebase/performance';
import type { OracleRequest, OracleResponse, TrustMetadata } from '../../types';
import { TrustPanel } from '../trust/TrustPanel';

/** Artificial typing cadence used when revealing streamed Oracle deltas char-by-char. */
const STREAM_CHARACTER_REVEAL_DELAY_MS = 14;

/** Fallback confidence injected when streaming payloads omit explicit certainty scoring. */
const STREAMING_ORACLE_FALLBACK_CONFIDENCE = 0.9;

/** Motion cadence applied to the caret pulse rendered during active streaming. */
const STREAMING_ORACLE_CARET_PULSE_DURATION_SEC = 0.9;

/** Motion duration controlling trust bundle entrance choreography post-stream. */
const STREAMING_ORACLE_TRUST_ENTRANCE_DURATION_SEC = 0.3;

/**
 * Props for {@link StreamingOraclePanel}.
 */
export interface StreamingOraclePanelProps {
  /** Structured Oracle envelope mirrored into `/api/oracle/stream` requests. */
  request: OracleRequest;
  /** Session identifier correlating streaming spans with trust telemetry. */
  sessionId: string;
  /** Optional bearer token authenticating streaming lanes against Firebase auth. */
  token?: string | null | undefined;
  /** Invoked once structured Oracle JSON is reconstructed from streamed deltas. */
  onComplete?: ((response: OracleResponse) => void) | undefined;
  /** Surfaces recoverable streaming failures back into civic orchestrators. */
  onError?: ((message: string) => void) | undefined;
  /** Optional explicit retry hook when upstream orchestrators manage fetch wiring. */
  onRetry?: (() => void) | undefined;
}

/**
 * Defers execution briefly so optimistic typing UX stays readable during bursts.
 *
 * @returns Promise resolving after {@link STREAM_CHARACTER_REVEAL_DELAY_MS}.
 */
const waitForStreamCharacter = (): Promise<void> =>
  new Promise((resolve: () => void) => {
    window.setTimeout(resolve, STREAM_CHARACTER_REVEAL_DELAY_MS);
  });

/**
 * Creates deterministic Oracle payloads when streaming terminates without structured chunks.
 *
 * @param request - Original civic envelope anchoring continuity metadata.
 * @param message - Concatenated transcript accumulated across streamed deltas.
 * @param trustBundle - Optional trust metadata inferred from structured fragments.
 * @returns Structured Oracle response satisfying downstream Agentic render contracts.
 */
const createStreamingOracleFallbackResponse = (
  request: OracleRequest,
  message: string,
  trustBundle: TrustMetadata | null,
): OracleResponse => ({
  cognitiveLevel: request.cognitiveLevel,
  confidence: trustBundle?.confidence ?? STREAMING_ORACLE_FALLBACK_CONFIDENCE,
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
  stateTransition: request.currentState,
  tone: 'informative',
  trust: trustBundle ?? undefined,
});

/**
 * Decorative streaming caret signaling Oracle still synthesizing civic guidance.
 *
 * @returns Animated glyph respecting infinite pulse choreography.
 */
function StreamingOracleCaretIndicator(): ReactNode {
  return (
    <motion.span
      animate={{ opacity: [0.2, 1, 0.2] }}
      aria-hidden="true"
      className="ml-1 inline-block text-[var(--civic-green)]"
      transition={{ duration: STREAMING_ORACLE_CARET_PULSE_DURATION_SEC, repeat: Infinity }}
    >
      ▊
    </motion.span>
  );
}

/**
 * Streams Oracle NDJSON responses while preserving civic trust surfaces + telemetry hooks.
 *
 * @param props - Oracle envelope, optional auth token, and orchestrator callbacks.
 * @returns Accessible streaming transcript shell with trust reinforcement rail.
 */
export function StreamingOraclePanel({
  request,
  sessionId,
  token,
  onComplete,
  onError,
  onRetry,
}: StreamingOraclePanelProps): ReactNode {
  const [buffer, setBuffer] = useState<string>('');
  const [streaming, setStreaming] = useState<boolean>(false);
  const [trust, setTrust] = useState<TrustMetadata | null>(null);
  const [stopped, setStopped] = useState<boolean>(false);
  const [interrupted, setInterrupted] = useState<boolean>(false);
  const [finalAnnouncement, setFinalAnnouncement] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef<string>('');
  const trustRef = useRef<TrustMetadata | null>(null);

  const appendDelta = useCallback(async (delta: string, signal: AbortSignal): Promise<void> => {
    for (const character of delta) {
      if (signal.aborted) {
        break;
      }
      bufferRef.current += character;
      setBuffer(bufferRef.current);
      await waitForStreamCharacter();
    }
  }, []);

  const startStream = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    const latencyTrace = measureStreamingLatency();
    let firstTokenSeen = false;

    abortRef.current = controller;
    bufferRef.current = '';
    trustRef.current = null;
    setBuffer('');
    setTrust(null);
    setStopped(false);
    setInterrupted(false);
    setFinalAnnouncement('');
    setStreaming(true);
    latencyTrace.start();

    try {
      for await (const chunk of streamOracle(request, controller.signal, token)) {
        if (!firstTokenSeen && chunk.delta) {
          firstTokenSeen = true;
          latencyTrace.stop();
        }

        if (chunk.delta) {
          await appendDelta(chunk.delta, controller.signal);
        }

        if (chunk.trust) {
          trustRef.current = chunk.trust;
          setTrust(chunk.trust);
        }

        if (chunk.done) {
          const finalTrust = chunk.trust ?? trustRef.current;
          const finalResponse =
            chunk.response ??
            createStreamingOracleFallbackResponse(request, bufferRef.current, finalTrust);

          setStreaming(false);
          setFinalAnnouncement(bufferRef.current);
          civicBus.emit({ payload: finalResponse, type: 'ORACLE_RESPONSE' });
          onComplete?.(finalResponse);
          return;
        }
      }

      const finalResponse = createStreamingOracleFallbackResponse(
        request,
        bufferRef.current,
        trustRef.current,
      );
      setStreaming(false);
      setFinalAnnouncement(bufferRef.current);
      civicBus.emit({ payload: finalResponse, type: 'ORACLE_RESPONSE' });
      onComplete?.(finalResponse);
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        setStopped(true);
      } else {
        setInterrupted(true);
        bufferRef.current = `${bufferRef.current}\n\n[Response interrupted]`;
        setBuffer(bufferRef.current);
        const message = error instanceof Error ? error.message : 'Oracle stream interrupted';
        logger.error('Oracle streaming session failed', error);
        onError?.(message);
      }
      setStreaming(false);
    } finally {
      if (!firstTokenSeen) {
        latencyTrace.stop();
      }
    }
  }, [appendDelta, onComplete, onError, request, token]);

  useEffect((): (() => void) => {
    void startStream().catch((error: unknown): void => {
      logger.error('StreamingOraclePanel failed to bootstrap stream', error);
    });
    return (): void => {
      abortRef.current?.abort();
    };
  }, [startStream]);

  const handleStop = (): void => {
    abortRef.current?.abort();
    setStreaming(false);
    setStopped(true);
    onError?.('Response stopped');
  };

  const handleRetryClick = (): void => {
    if (onRetry) {
      onRetry();
      return;
    }
    void startStream().catch((error: unknown): void => {
      logger.error('StreamingOraclePanel implicit retry failed', error);
    });
  };

  return (
    <section
      aria-atomic="true"
      aria-busy={streaming}
      aria-live="polite"
      className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_24px_var(--shadow)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Oracle</p>
        {streaming ? (
          <button
            type="button"
            className="min-h-10 rounded-full border border-[var(--border)] px-3 text-sm font-semibold text-[var(--ink)]"
            onClick={handleStop}
          >
            Stop generating
          </button>
        ) : null}
      </div>

      <p aria-hidden={streaming} className="mt-4 whitespace-pre-wrap text-lg leading-8 text-[var(--ink)]">
        {buffer}
        {streaming ? <StreamingOracleCaretIndicator /> : null}
      </p>

      <span className="sr-only">{finalAnnouncement}</span>

      <div className="mt-4 flex flex-wrap gap-2">
        {stopped ? (
          <span className="rounded-full bg-[var(--civic-amber-light)] px-3 py-1 text-sm font-semibold text-[var(--ink)]">
            Response stopped
          </span>
        ) : null}
        {interrupted ? (
          <button
            type="button"
            className="min-h-10 rounded-full bg-[var(--ink)] px-4 text-sm font-bold text-[var(--surface)]"
            onClick={handleRetryClick}
          >
            Retry
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {!streaming && trust ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: STREAMING_ORACLE_TRUST_ENTRANCE_DURATION_SEC }}
          >
            <TrustPanel sessionId={sessionId} trust={trust} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
