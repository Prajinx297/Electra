import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { JOURNEY_GRAPH, JOURNEY_STATES, useElectraStore } from '../../engines/stateEngine';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import type { JourneyState } from '../../types';

interface JourneyVisualizerProps {
  onExplainStep: (stepName: string) => Promise<void>;
}

interface NodePosition {
  x: number;
  y: number;
  level: number;
}

const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (index: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: index * 0.05, type: 'spring', stiffness: 260, damping: 20 },
  }),
};

const pathVariants: Variants = {
  hidden: { pathLength: 0 },
  visible: { pathLength: 1, transition: { duration: 0.8, ease: 'easeInOut' } },
};

const categoryTime: Record<string, string> = {
  welcome: '2 min',
  registration: '5 min',
  verification: '4 min',
  voting: '6 min',
  counting: '3 min',
  support: '4 min',
  completion: '1 min',
};

const buildLevels = () => {
  const levels: Partial<Record<JourneyState, number>> = { WELCOME: 0 };
  const queue: JourneyState[] = ['WELCOME'];

  while (queue.length) {
    const current = queue.shift()!;
    const currentLevel = levels[current] ?? 0;
    for (const next of JOURNEY_GRAPH[current].allowedTransitions) {
      const nextLevel = currentLevel + 1;
      if (levels[next] === undefined || nextLevel < (levels[next] ?? Number.POSITIVE_INFINITY)) {
        levels[next] = nextLevel;
        queue.push(next);
      }
    }
  }

  for (const state of JOURNEY_STATES) {
    if (levels[state] === undefined) {
      levels[state] = 0;
    }
  }

  return levels as Record<JourneyState, number>;
};

const buildPositions = (): Record<JourneyState, NodePosition> => {
  const levels = buildLevels();
  const grouped = JOURNEY_STATES.reduce<Record<number, JourneyState[]>>((acc, state) => {
    const level = levels[state];
    acc[level] = [...(acc[level] ?? []), state];
    return acc;
  }, {});

  return JOURNEY_STATES.reduce<Record<JourneyState, NodePosition>>(
    (acc, state) => {
      const level = levels[state];
      const siblings = grouped[level] ?? [];
      const index = siblings.indexOf(state);
      const spread = 900 / Math.max(siblings.length, 1);
      acc[state] = {
        x: 70 + spread / 2 + index * spread,
        y: 72 + level * 132,
        level,
      };
      return acc;
    },
    {} as Record<JourneyState, NodePosition>,
  );
};

export const JourneyVisualizer = ({ onExplainStep }: JourneyVisualizerProps) => {
  const enabled = useFeatureFlag('journey_visualizer_enabled');
  const viewportRef = useRef<HTMLDivElement>(null);
  const positions = useMemo(buildPositions, []);
  const { currentState, history, currentResponse, rewindToState } = useElectraStore();
  const [hovered, setHovered] = useState<JourneyState | null>(null);
  const [focusedNode, setFocusedNode] = useState<JourneyState>(currentState);
  const [replaying, setReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const completedStates = useMemo(
    () => Array.from(new Set(history.map((entry) => entry.state))),
    [history],
  );
  const completedSet = useMemo(() => new Set(completedStates), [completedStates]);
  const maxLevel = Math.max(...Object.values(positions).map((position) => position.level));
  const viewHeight = Math.max(760, 180 + maxLevel * 132);

  useEffect(() => {
    setFocusedNode(currentState);
  }, [currentState]);

  useEffect(() => {
    if (!replaying) {
      return;
    }

    setReplayIndex(0);
    const timer = window.setInterval(() => {
      setReplayIndex((current) => {
        if (current >= completedStates.length - 1) {
          window.clearInterval(timer);
          setReplaying(false);
          return current;
        }
        return current + 1;
      });
    }, 700);

    return () => window.clearInterval(timer);
  }, [completedStates.length, replaying]);

  if (!enabled) {
    return null;
  }

  const predecessor = JOURNEY_STATES.find((state) =>
    JOURNEY_GRAPH[state].allowedTransitions.includes(focusedNode),
  );
  const focusedPosition = positions[focusedNode];
  const replayState = completedStates[replayIndex] ?? completedStates[0] ?? currentState;
  const replayPosition = positions[replayState];

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusedNode(JOURNEY_GRAPH[focusedNode].allowedTransitions[0] ?? focusedNode);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedNode(predecessor ?? focusedNode);
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      rewindToState(focusedNode);
    }
  };

  return (
    <section
      ref={viewportRef}
      tabIndex={0}
      onKeyDown={handleKeyboard}
      className="relative h-[calc(100vh-180px)] min-h-[620px] overflow-auto rounded-lg bg-[#07111f] text-white shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
      aria-label="Animated civic journey graph"
    >
      <style>
        {`
          @keyframes electraDash {
            to { stroke-dashoffset: -22; }
          }
          @keyframes completedNodePulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
          .journey-edge-motion {
            stroke-dasharray: 8 14;
            animation: electraDash 1.4s linear infinite;
          }
          .completed-node-pulse {
            animation: completedNodePulse 2s ease-in-out infinite;
          }
        `}
      </style>
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#07111f]/95 p-4 backdrop-blur">
        <div>
          <h2 className="text-lg font-bold">Civic Journey</h2>
          <p className="text-sm text-slate-300">{JOURNEY_GRAPH[currentState].label}</p>
        </div>
        <button
          type="button"
          onClick={() => setReplaying(true)}
          className="min-h-10 rounded-lg bg-white px-3 text-sm font-bold text-[#07111f]"
        >
          Replay my journey
        </button>
      </div>

      <svg
        width="1000"
        height={viewHeight}
        viewBox={`0 0 1000 ${viewHeight}`}
        className="absolute left-0 top-0 min-h-full min-w-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="journeyGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {JOURNEY_STATES.flatMap((state) =>
          JOURNEY_GRAPH[state].allowedTransitions.map((next) => {
            const from = positions[state];
            const to = positions[next];
            const controlY = (from.y + to.y) / 2;
            const completed = completedSet.has(state) && completedSet.has(next);
            return (
              <motion.path
                key={`${state}-${next}`}
                d={`M ${from.x} ${from.y + 34} C ${from.x} ${controlY}, ${to.x} ${controlY}, ${to.x} ${to.y - 34}`}
                fill="none"
                stroke={completed ? '#6ee7a8' : '#2d6cdf'}
                strokeWidth={completed ? 3 : 2}
                className={completed ? 'journey-edge-motion' : undefined}
                variants={pathVariants}
                initial="hidden"
                animate="visible"
                opacity={completed ? 0.9 : 0.35}
              />
            );
          }),
        )}
        {replaying && replayPosition ? (
          <motion.circle
            key={replayState}
            cx={replayPosition.x}
            cy={replayPosition.y}
            r="10"
            fill="#f8d36b"
            filter="url(#journeyGlow)"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 1 }}
            transition={{ duration: 0.35 }}
          />
        ) : null}
      </svg>

      <div className="relative z-10" style={{ height: viewHeight }}>
        {JOURNEY_STATES.map((state, index) => {
          const node = JOURNEY_GRAPH[state];
          const position = positions[state];
          const isCurrent = state === currentState;
          const isFocused = state === focusedNode;
          const isCompleted = completedSet.has(state);
          const isFuture = !isCompleted && !isCurrent;
          const isSkipped = history.some((entry) => entry.state === state && entry.rewound);

          return (
            <motion.button
              key={state}
              type="button"
              custom={index}
              variants={nodeVariants}
              initial="hidden"
              animate="visible"
              onMouseEnter={() => setHovered(state)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setFocusedNode(state)}
              onClick={() => void onExplainStep(node.label)}
              className={`absolute w-[168px] rounded-lg border p-3 text-left shadow-xl transition ${
                isCurrent
                  ? 'border-sky-300 bg-sky-500/35 ring-4 ring-sky-300/35'
                  : isCompleted
                    ? 'border-emerald-300 bg-emerald-500/25'
                    : 'border-white/10 bg-white/10'
              } ${isCompleted ? 'completed-node-pulse' : ''} ${isFuture ? 'opacity-40' : 'opacity-100'} ${isFocused ? 'outline outline-2 outline-offset-2 outline-white' : ''}`}
              style={{
                left: position.x - 84,
                top: position.y - 40,
                textDecoration: isSkipped ? 'line-through' : 'none',
              }}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-200">
                {categoryTime[node.category]}
              </span>
              <span className="mt-1 block text-sm font-bold">{node.label}</span>
              <span className="mt-2 block text-xs text-slate-200">
                {isCompleted ? '✓ Completed' : isCurrent ? 'Current' : 'Future'}
              </span>
              {hovered === state ? (
                <span className="absolute left-0 top-[calc(100%+8px)] z-30 w-64 rounded-lg border border-white/10 bg-[#0d1d33] p-3 text-xs leading-5 text-slate-100 shadow-2xl">
                  {node.consequenceData.bestPath}
                  {isCurrent ? ` ${currentResponse.message}` : ''}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>

      <div className="sticky bottom-4 left-full z-30 ml-auto mr-4 h-28 w-40 rounded-lg border border-white/10 bg-[#0d1d33]/95 p-2 shadow-2xl">
        <svg viewBox="0 0 1000 1000" className="h-full w-full" aria-label="Journey minimap">
          {JOURNEY_STATES.map((state) => {
            const position = positions[state];
            return (
              <circle
                key={state}
                cx={position.x}
                cy={(position.y / viewHeight) * 1000}
                r={state === currentState ? 18 : 8}
                fill={
                  state === currentState
                    ? '#7dd3fc'
                    : completedSet.has(state)
                      ? '#6ee7a8'
                      : '#64748b'
                }
              />
            );
          })}
          <rect
            x={Math.max(0, focusedPosition.x - 40)}
            y={Math.max(0, (focusedPosition.y / viewHeight) * 1000 - 40)}
            width="80"
            height="80"
            fill="none"
            stroke="#f8d36b"
            strokeWidth="8"
          />
        </svg>
      </div>
    </section>
  );
};
