import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

import type { Tone } from '../../types';
import { buildOracleAriaLabel } from '../../utils/accessibilityHelpers';

/** Milliseconds between typewriter ticks for Oracle prose reveals. */
const ORACLE_TYPEWRITER_TICK_MS = 40;

/** Motion duration (seconds) when typewriter-friendly animation is enabled. */
const ORACLE_MESSAGE_MOTION_DURATION_SEC = 0.2;

/** Vertical entrance offset (pixels) for Oracle message choreography. */
const ORACLE_MESSAGE_INITIAL_OFFSET_Y_PX = 8;

/**
 * Props for {@link OracleMessage}.
 */
export interface OracleMessageProps {
  /** Oracle conversational copy rendered inside the civic transcript card. */
  message: string;
  /** Emotional tone influencing motion + assistive live-region politeness. */
  tone: Tone;
}

/**
 * Typewriter-style incremental reveal for Oracle prose when motion is allowed.
 *
 * @param message - Complete Oracle utterance to disclose progressively.
 * @param prefersReducedMotion - When true, renders the entire message immediately.
 * @returns Currently revealed substring for display.
 * @example
 * const visible = useOracleTypewriterReveal('Welcome!', false);
 * // visible grows character-by-character until the full message shows.
 */
function useOracleTypewriterReveal(message: string, prefersReducedMotion: boolean): string {
  const [visible, setVisible] = useState<string>(() =>
    prefersReducedMotion ? message : '',
  );

  useEffect((): (() => void) => {
    if (prefersReducedMotion) {
      setVisible(message);
      return (): void => {};
    }

    let index = 0;
    const timer = window.setInterval((): void => {
      index += 1;
      setVisible(message.slice(0, index));
      if (index >= message.length) {
        window.clearInterval(timer);
      }
    }, ORACLE_TYPEWRITER_TICK_MS);

    return (): void => {
      window.clearInterval(timer);
    };
  }, [message, prefersReducedMotion]);

  return visible;
}

/**
 * Oracle conversational transcript card with respectful motion and typewriter reveals.
 *
 * Surfaces assistive labels derived from tone-aware helpers so screen readers track updates.
 *
 * @param props - Oracle message body plus semantic tone metadata.
 * @returns Styled transcript panel suitable for the civic companion rail.
 */
export function OracleMessage({ message, tone }: OracleMessageProps): ReactNode {
  const reducedMotion = useReducedMotion() ?? false;
  const visibleMessage = useOracleTypewriterReveal(message, reducedMotion);

  const motionProps =
    reducedMotion === true
      ? {}
      : {
          initial: { opacity: 0, y: ORACLE_MESSAGE_INITIAL_OFFSET_Y_PX },
          animate: { opacity: 1, y: 0 },
        };

  const motionDuration =
    reducedMotion === true ? 0 : ORACLE_MESSAGE_MOTION_DURATION_SEC;

  return (
    <motion.div
      aria-atomic="true"
      aria-label={buildOracleAriaLabel(message, tone)}
      aria-live={tone === 'warning' ? 'assertive' : 'polite'}
      className="rounded-[24px] bg-[var(--surface)] p-5 shadow-[0_8px_24px_var(--shadow)]"
      role="log"
      transition={{ duration: motionDuration }}
      {...motionProps}
    >
      <div className="inline-flex rounded-full bg-[var(--accent-light)] px-3 py-1 text-sm font-semibold text-[var(--accent)]">
        Oracle
      </div>
      <p className="mt-4 text-[1.1rem] leading-[1.75] text-[var(--ink)]">{visibleMessage}</p>
    </motion.div>
  );
}
