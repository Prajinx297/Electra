import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import { streamOracle } from '../../engines/oracleClient';
import { civicBus } from '../../events/civicEventBus';
import { measureStreamingLatency } from '../../firebase/performance';
import type { OracleRequest, OracleResponse, TrustMetadata } from '../../types';
import { TrustPanel } from '../trust/TrustPanel';


interface StreamingProps {
  request: OracleRequest;
  sessionId: string;
  token?: string | null | undefined;
  onComplete?: ((response: OracleResponse) => void) | undefined;
  onError?: ((message: string) => void) | undefined;
  onRetry?: (() => void) | undefined;
}

const waitForCharacter = () =>
  new Promise((resolve) => {
    window.setTimeout(resolve, 14);
  });

const createResponseFromStream = (
  request: OracleRequest,
  message: string,
  trust: TrustMetadata | null,
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
  stateTransition: request.currentState,
  cognitiveLevel: request.cognitiveLevel,
  nextAnticipated: null,
  confidence: trust?.confidence ?? 0.9,
  trust: trust ?? undefined,
});

export const StreamingOraclePanel = ({
  request,
  sessionId,
  token,
  onComplete,
  onError,
  onRetry,
}: StreamingProps) => {
  const [buffer, setBuffer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [trust, setTrust] = useState<TrustMetadata | null>(null);
  const [stopped, setStopped] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [finalAnnouncement, setFinalAnnouncement] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef('');
  const trustRef = useRef<TrustMetadata | null>(null);

  const appendDelta = useCallback(async (delta: string, signal: AbortSignal) => {
    for (const character of delta) {
      if (signal.aborted) {
        break;
      }
      bufferRef.current += character;
      setBuffer(bufferRef.current);
      await waitForCharacter();
    }
  }, []);

  const startStream = useCallback(async () => {
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
            chunk.response ?? createResponseFromStream(request, bufferRef.current, finalTrust);

          setStreaming(false);
          setFinalAnnouncement(bufferRef.current);
          civicBus.emit({ type: 'ORACLE_RESPONSE', payload: finalResponse });
          onComplete?.(finalResponse);
          return;
        }
      }

      const finalResponse = createResponseFromStream(request, bufferRef.current, trustRef.current);
      setStreaming(false);
      setFinalAnnouncement(bufferRef.current);
      civicBus.emit({ type: 'ORACLE_RESPONSE', payload: finalResponse });
      onComplete?.(finalResponse);
    } catch (error) {
      if (controller.signal.aborted) {
        setStopped(true);
      } else {
        setInterrupted(true);
        bufferRef.current = `${bufferRef.current}\n\n[Response interrupted]`;
        setBuffer(bufferRef.current);
        onError?.(error instanceof Error ? error.message : 'Oracle stream interrupted');
      }
      setStreaming(false);
    } finally {
      if (!firstTokenSeen) {
        latencyTrace.stop();
      }
    }
  }, [appendDelta, onComplete, onError, request, token]);

  useEffect(() => {
    void startStream();
    return () => abortRef.current?.abort();
  }, [startStream]);

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setStopped(true);
    onError?.('Response stopped');
  };

  return (
    <section
      aria-live="polite"
      aria-busy={streaming}
      aria-atomic="true"
      className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_8px_24px_var(--shadow)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--accent)]">Oracle</p>
        {streaming ? (
          <button
            type="button"
            onClick={handleStop}
            className="min-h-10 rounded-full border border-[var(--border)] px-3 text-sm font-semibold text-[var(--ink)]"
          >
            Stop generating
          </button>
        ) : null}
      </div>

      <p
        className="mt-4 whitespace-pre-wrap text-lg leading-8 text-[var(--ink)]"
        aria-hidden={streaming}
      >
        {buffer}
        {streaming ? (
          <motion.span
            aria-hidden="true"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            className="ml-1 inline-block text-[var(--civic-green)]"
          >
            ▊
          </motion.span>
        ) : null}
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
            onClick={onRetry ?? (() => void startStream())}
            className="min-h-10 rounded-full bg-[var(--ink)] px-4 text-sm font-bold text-[var(--surface)]"
          >
            Retry
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {!streaming && trust ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="mt-5"
          >
            <TrustPanel sessionId={sessionId} trust={trust} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};
