import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

interface ArenaTransitionProps extends PropsWithChildren {
  transitionKey: string;
}

export const ArenaTransition = ({ transitionKey, children }: ArenaTransitionProps) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        {...(shouldReduceMotion
          ? {}
          : {
              initial: { opacity: 0, x: 24, scale: 0.985 },
              animate: { opacity: 1, x: 0, scale: 1 },
              exit: { opacity: 0, x: -24, scale: 0.985 },
            })}
        transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: 'easeInOut' }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
