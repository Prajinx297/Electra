import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { PropsWithChildren, ReactNode } from 'react';

/** Horizontal drift amplitude for arena slide transitions (pixels). */
const ARENA_MOTION_OFFSET_X_PX = 24;

/** Subtle scale delta applied during arena mount/unmount transitions. */
const ARENA_MOTION_SCALE_DELTA = 0.985;

/** Full-motion choreography duration (seconds). */
const ARENA_MOTION_DURATION_SEC = 0.32;

/** Duration applied when the user prefers reduced motion (instant swap). */
const ARENA_MOTION_DURATION_REDUCED_SEC = 0;

/** Framer Motion easing curve token for arena choreography. */
const ARENA_MOTION_EASE = 'easeInOut';

/**
 * Props for {@link ArenaTransition}.
 */
export interface ArenaTransitionProps extends PropsWithChildren {
  /** Stable key driving AnimatePresence swap semantics across Oracle steps. */
  transitionKey: string;
}

/**
 * Wraps arena children with respectful motion: full choreography by default,
 * instant swaps when reduced-motion is requested.
 *
 * @param props - Transition key plus nested civic workspace markup.
 * @returns Presence-managed motion container around {@link ArenaTransitionProps.children}.
 */
export function ArenaTransition({ transitionKey, children }: ArenaTransitionProps): ReactNode {
  const shouldReduceMotion = useReducedMotion() ?? false;

  const motionPreset =
    shouldReduceMotion === true
      ? {}
      : {
          initial: { opacity: 0, x: ARENA_MOTION_OFFSET_X_PX, scale: ARENA_MOTION_SCALE_DELTA },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: -ARENA_MOTION_OFFSET_X_PX, scale: ARENA_MOTION_SCALE_DELTA },
        };

  const transitionDuration =
    shouldReduceMotion === true ? ARENA_MOTION_DURATION_REDUCED_SEC : ARENA_MOTION_DURATION_SEC;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        {...motionPreset}
        transition={{ duration: transitionDuration, ease: ARENA_MOTION_EASE }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
