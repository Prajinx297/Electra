import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import type { Tone } from '../../types';
import { buildOracleAriaLabel } from '../../utils/accessibilityHelpers';
import { getEntranceMotionProps } from '../../utils/motion';


interface OracleMessageProps {
  message: string;
  tone: Tone;
}

export const OracleMessage = ({ message, tone }: OracleMessageProps): JSX.Element => {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(reducedMotion ? message : '');

  useEffect(() => {
    if (reducedMotion) {
      setVisible(message);
      return;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(message.slice(0, index));
      if (index >= message.length) {
        window.clearInterval(timer);
      }
    }, 40);

    return () => window.clearInterval(timer);
  }, [message, reducedMotion]);

  return (
    <motion.div
      className="rounded-[24px] bg-[var(--surface)] p-5 shadow-[0_8px_24px_var(--shadow)]"
      {...getEntranceMotionProps(reducedMotion)}
      transition={{ duration: reducedMotion ? 0 : 0.2 }}
      role="log"
      aria-live={tone === 'warning' ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-label={buildOracleAriaLabel(message, tone)}
    >
      <div className="inline-flex rounded-full bg-[var(--accent-light)] px-3 py-1 text-sm font-semibold text-[var(--accent)]">
        Oracle
      </div>
      <p className="mt-4 text-[1.1rem] leading-[1.75] text-[var(--ink)]">{visible}</p>
    </motion.div>
  );
};
