import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type LegacyRef,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';

import { logger } from '@/lib/logger';

import { useElectraStore } from '../../engines/stateEngine';
import { civicBus } from '../../events/civicEventBus';
import { CivicScoreCard } from '../../features/civic-score/CivicScoreCard';
import { JourneyVisualizer } from '../../features/journey/JourneyVisualizer';
import { ElectionSimulator } from '../../features/simulator/ElectionSimulator';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import type {
  CognitiveLevel,
  LanguageCode,
  OracleRequest,
  OracleResponse,
  RenderKey,
} from '../../types';
import { focusFirstInteractive } from '../../utils/accessibilityHelpers';
import { ArenaPanel } from '../arena/ArenaPanel';
import { OracleErrorBoundary } from '../errors/OracleErrorBoundary';
import { JourneySidebar } from '../journey/JourneySidebar';
import { ProgressDots } from '../journey/ProgressDots';
import { ActionBar } from '../oracle/ActionBar';
import { OraclePanel } from '../oracle/OraclePanel';

import { ContextPanel } from './ContextPanel';
import { Header } from './Header';

/** Maximum preview characters mirrored inside {@link ContextPanel} summaries. */
const CONTEXT_SUMMARY_PREVIEW_CHAR_LIMIT = 88;

/** Fallback confidence surfaced when Oracle payloads omit numeric certainty hints. */
const CONTEXT_PANEL_DEFAULT_CONFIDENCE = 0.97;

/** Serialized civic score snapshot persisted for resilient learner badges UI. */
const ELECTRA_CIVIC_SCORE_STORAGE_KEY = 'electra:civic-score';

/** Reward increments wired through civic bus subscription trivia. */
const CIVIC_SCORE_ORACLE_RESPONSE_DELTA = 10;
const CIVIC_SCORE_STEP_COMPLETED_DELTA = 25;
const CIVIC_SCORE_CONFUSION_DELTA = 5;

/** Vertical choreography offset for arena swaps inside {@link AnimatePresence}. */
const ARENA_STAGE_INITIAL_OFFSET_Y_PX = 8;

/** Duration applied to arena presence choreography when motion is permitted. */
const ARENA_STAGE_TRANSITION_DURATION_SEC = 0.3;

/**
 * Props for {@link AppShell}.
 */
export interface AppShellProps {
  /** Accessible learner moniker surfaced inside {@link Header}. */
  userLabel: string;
  /** True while synchronous Oracle transport blocks learner interactions. */
  busy: boolean;
  /** Dispatches civic prompts sourced from contextual shortcuts + rail widgets. */
  onAsk: (message: string) => Promise<void>;
  /** Primary Oracle action affordance handler mirrored into {@link ActionBar}. */
  onPrimaryAction: () => void;
  /** Secondary Oracle affordance handler mirrored into {@link ActionBar}. */
  onSecondaryAction: () => void;
  /** Persists localization mutations triggered inside {@link Header}. */
  onLanguageChange: (language: LanguageCode) => void;
  /** Persists cognitive fidelity mutations emitted by {@link OraclePanel}. */
  onCognitiveLevelChange: (level: CognitiveLevel) => void;
  /** Invokes Firebase-backed authentication flows from civic chrome controls. */
  onSignIn: () => Promise<unknown>;
  /** Streaming oracle continuation payload when Gemini chunked responses active. */
  streamRequest?: OracleRequest | null;
  /** Resume token bridging chunked streaming reconnect semantics. */
  streamToken?: string | null;
  /** Lifecycle hook invoked once streamed Oracle JSON validates successfully. */
  onStreamComplete?: (response: OracleResponse) => void;
  /** Surfaces recoverable streaming faults back into orchestration telemetry. */
  onStreamError?: (message: string) => void;
  /** Optional demo flourish explaining predictive prefetch hits for judges. */
  demoAnnotation: string | null;
}

interface StoredScoreSnapshot {
  score?: number | undefined;
  streakDays?: number | undefined;
}

/**
 * Reads the persisted learner score snapshot from {@link localStorage}.
 *
 * @returns Numeric score component safe for badge pulses.
 */
function readStoredScoreTotal(): number {
  const raw = window.localStorage.getItem(ELECTRA_CIVIC_SCORE_STORAGE_KEY);
  if (!raw) {
    return 0;
  }
  try {
    const parsed = JSON.parse(raw) as StoredScoreSnapshot;
    return parsed.score ?? 0;
  } catch (err: unknown) {
    logger.warn('Failed to parse stored civic score snapshot', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Applies incremental civic score mutations derived from civic bus emissions.
 *
 * @param points - Positive delta applied to the persisted learner tally.
 */
function persistIncrementalScore(points: number): void {
  const raw = window.localStorage.getItem(ELECTRA_CIVIC_SCORE_STORAGE_KEY);
  let currentScore = 0;
  let streakDays = 1;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredScoreSnapshot;
      currentScore = parsed.score ?? 0;
      streakDays = parsed.streakDays ?? 1;
    } catch (err: unknown) {
      logger.warn('Failed to parse civic score prior to mutation', {
        error: err instanceof Error ? err.message : String(err),
      });
      currentScore = 0;
    }
  }

  const nextScore = currentScore + points;
  window.localStorage.setItem(
    ELECTRA_CIVIC_SCORE_STORAGE_KEY,
    JSON.stringify({
      badges: [],
      highestBadge: null,
      score: nextScore,
      streakDays,
    }),
  );
}

/**
 * Keeps badge pulse totals synchronized whenever learners inspect score drawers.
 *
 * @param scoreOpen - Drawer visibility flag triggering snapshot refreshes.
 * @param setScorePulse - State setter receiving recomputed totals.
 */
function useScoreDrawerPulseSync(scoreOpen: boolean, setScorePulse: Dispatch<SetStateAction<number>>): void {
  useEffect((): void => {
    setScorePulse(readStoredScoreTotal());
  }, [scoreOpen, setScorePulse]);
}

/**
 * Subscribes to civic bus rewards so ambient chrome reflects asynchronous scoring events.
 *
 * @param setScorePulse - Updates ambient badge totals whenever rewards fire.
 */
function useCivicBusScoreRewards(setScorePulse: Dispatch<SetStateAction<number>>): void {
  useEffect((): (() => void) => {
    const applyScore = (points: number): void => {
      persistIncrementalScore(points);
      setScorePulse(readStoredScoreTotal());
    };

    const unsubscribeOracle = civicBus.on('ORACLE_RESPONSE', (): void => {
      applyScore(CIVIC_SCORE_ORACLE_RESPONSE_DELTA);
    });
    const unsubscribeStep = civicBus.on('STEP_COMPLETED', (): void => {
      applyScore(CIVIC_SCORE_STEP_COMPLETED_DELTA);
    });
    const unsubscribeConfusion = civicBus.on('CONFUSION_DETECTED', (): void => {
      applyScore(CIVIC_SCORE_CONFUSION_DELTA);
    });
    const unsubscribeScore = civicBus.on('SCORE_EARNED', ({ points }: { points: number }): void => {
      applyScore(points);
    });

    return (): void => {
      unsubscribeOracle();
      unsubscribeStep();
      unsubscribeConfusion();
      unsubscribeScore();
    };
  }, [setScorePulse]);
}

/**
 * Repositions focus onto the first actionable control after arena swaps.
 *
 * @param currentRender - Latest Oracle render directive triggering focus resets.
 * @param mainRef - Reference to the semantic main landmark hosting civic widgets.
 */
function useFocusAfterArenaSwap(currentRender: unknown, mainRef: RefObject<HTMLDivElement | null>): void {
  const hasMounted = useRef<boolean>(false);

  useEffect((): void => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    focusFirstInteractive(mainRef.current);
  }, [currentRender, mainRef]);
}

/**
 * Ensures the skip-link receives keyboard priority on first Tab press per session.
 *
 * @param skipLinkRef - Reference pointing at the visually hidden skip affordance.
 */
function useSkipLinkFirstTabFocus(skipLinkRef: RefObject<HTMLButtonElement | null>): void {
  useEffect((): (() => void) => {
    const handleFirstTab = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') {
        return;
      }
      const active = document.activeElement;
      if (active && active !== document.body) {
        return;
      }
      event.preventDefault();
      skipLinkRef.current?.focus();
    };

    window.addEventListener('keydown', handleFirstTab, { once: true });
    return (): void => {
      window.removeEventListener('keydown', handleFirstTab);
    };
  }, [skipLinkRef]);
}

/**
 * Props for {@link AppShellDemoAnnotationBanner}.
 */
interface AppShellDemoAnnotationBannerProps {
  /** Optional judge-facing annotation explaining prefetch miracles. */
  demoAnnotation: string | null;
}

/**
 * Surfaced only during scripted demos to narrate predictive caching wins.
 *
 * @param props - Nullable annotation payload sourced from orchestrators.
 * @returns Highlight banner or null when annotations are absent.
 */
function AppShellDemoAnnotationBanner({ demoAnnotation }: AppShellDemoAnnotationBannerProps): ReactNode {
  if (!demoAnnotation) {
    return null;
  }
  return (
    <div className="mb-4 rounded-[18px] bg-[var(--accent-light)] px-4 py-3 text-sm text-[var(--ink)]">
      {demoAnnotation}
    </div>
  );
}

/**
 * Props for {@link AppShellArenaStage}.
 */
interface AppShellArenaStageProps {
  /** Presence key combining render targets with Oracle state transitions. */
  motionKey: string;
  /** Latest Oracle render directive forwarded into {@link ArenaPanel}. */
  render: RenderKey | null;
  /** Serialized props forwarded alongside the render directive. */
  renderProps: Record<string, unknown>;
  /** Mirrors Framer reduced-motion preference for respectful choreography. */
  prefersReducedMotion: boolean;
}

/**
 * Presence-managed civic arena hosting Oracle-directed lazy modules.
 *
 * {@link ArenaPanel} already wraps mounts with {@link OracleErrorBoundary} via {@link ComponentRegistry}.
 *
 * @param props - Motion metadata plus serialized arena props.
 * @returns Animated shell delegating to {@link ArenaPanel}.
 */
function AppShellArenaStage({
  motionKey,
  render,
  renderProps,
  prefersReducedMotion,
}: AppShellArenaStageProps): ReactNode {
  const motionPreset =
    prefersReducedMotion === true
      ? {}
      : {
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0 },
          initial: { opacity: 0, y: ARENA_STAGE_INITIAL_OFFSET_Y_PX },
        };

  const transitionDuration =
    prefersReducedMotion === true ? 0 : ARENA_STAGE_TRANSITION_DURATION_SEC;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={motionKey}
        aria-atomic="true"
        aria-live="polite"
        role="status"
        {...motionPreset}
        transition={{ duration: transitionDuration }}
      >
        <ArenaPanel render={render} renderProps={renderProps} />
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Props for {@link AppShellOracleRail}.
 */
interface AppShellOracleRailProps {
  /** Busy flag surfaced to assistive technologies via aria-busy wiring. */
  busy: boolean;
  /** Canonical Oracle payload powering tone + trust surfaces. */
  response: OracleResponse;
  /** Localization tag forwarded into {@link OraclePanel}. */
  language: LanguageCode;
  /** Cognitive fidelity forwarded into {@link OraclePanel}. */
  cognitiveLevel: CognitiveLevel;
  /** Journey/session correlation identifier for telemetry scopes. */
  journeyId: string;
  /** Whether dwell-time heuristics surfaced the stuck intervention banner. */
  stuckInterventionVisible: boolean;
  /** Optional streaming continuation bundle. */
  streamRequest: OracleRequest | null | undefined;
  streamToken: string | null | undefined;
  onStreamComplete: ((response: OracleResponse) => void) | undefined;
  onStreamError: ((message: string) => void) | undefined;
  onAsk: (message: string) => Promise<void>;
  onCognitiveLevelChange: (level: CognitiveLevel) => void;
  onDismissStuck: () => void;
}

/**
 * Left-column Oracle workspace with isolated error containment.
 *
 * @param props - Oracle payload plus streaming/cognitive wiring.
 * @returns Accessible status region wrapping {@link OraclePanel}.
 */
function AppShellOracleRail(props: AppShellOracleRailProps): ReactNode {
  const {
    busy,
    response,
    language,
    cognitiveLevel,
    journeyId,
    stuckInterventionVisible,
    streamRequest,
    streamToken,
    onStreamComplete,
    onStreamError,
    onAsk,
    onCognitiveLevelChange,
    onDismissStuck,
  } = props;

  return (
    <div aria-busy={busy} aria-label="Oracle is thinking..." role="status">
      <OracleErrorBoundary>
        <OraclePanel
          busy={busy}
          cognitiveLevel={cognitiveLevel}
          language={language}
          onAsk={onAsk}
          onCognitiveLevelChange={onCognitiveLevelChange}
          onDismissStuck={onDismissStuck}
          onStreamComplete={onStreamComplete}
          onStreamError={onStreamError}
          response={response}
          sessionId={journeyId}
          streamRequest={streamRequest}
          streamToken={streamToken}
          stuckInterventionVisible={stuckInterventionVisible}
        />
      </OracleErrorBoundary>
    </div>
  );
}

/**
 * Props for {@link AppShellSkipLinkControl}.
 */
interface AppShellSkipLinkControlProps {
  /** Forwarded ref used by {@link useSkipLinkFirstTabFocus}. */
  skipLinkRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Provides keyboard-first navigation directly into the civic workspace landmark.
 *
 * @param props - Skip-link control wiring.
 * @returns Visually prominent skip affordance reused across breakpoints.
 */
function AppShellSkipLinkControl({ skipLinkRef }: AppShellSkipLinkControlProps): ReactNode {
  const handleSkipToMain = (): void => {
    const main = document.getElementById('main-content');
    main?.scrollIntoView({ block: 'start' });
    main?.focus();
  };

  return (
    <button
      ref={skipLinkRef as LegacyRef<HTMLButtonElement>}
      type="button"
      className="absolute left-4 top-4 rounded-full bg-[var(--civic-green)] px-4 py-2 text-white"
      onClick={handleSkipToMain}
    >
      Skip to main content
    </button>
  );
}

/**
 * Civic workspace chrome coordinating Oracle conversations, arena renders, and civic tooling.
 *
 * Composes journey visualization toggles, predictive prefetch orchestration metadata,
 * and accessibility-first focus routing across asynchronous Oracle updates.
 *
 * @param props - Shell callbacks mirroring orchestrator-owned transport flows.
 * @returns Responsive workspace scaffolding wrapping learner-facing civic intelligence UX.
 */
export function AppShell({
  userLabel,
  busy,
  onAsk,
  onPrimaryAction,
  onSecondaryAction,
  onLanguageChange,
  onCognitiveLevelChange,
  onSignIn,
  streamRequest = null,
  streamToken = null,
  onStreamComplete,
  onStreamError,
  demoAnnotation,
}: AppShellProps): ReactNode {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const visualizerEnabled = useFeatureFlag('journey_visualizer_enabled');
  const simulatorEnabled = useFeatureFlag('election_simulator_enabled');
  const scoreEnabled = useFeatureFlag('civic_score_enabled');
  const mainRef = useRef<HTMLDivElement>(null);
  const skipLinkRef = useRef<HTMLButtonElement>(null);
  const [visualizerOpen, setVisualizerOpen] = useState<boolean>(true);
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
  const [scoreOpen, setScoreOpen] = useState<boolean>(false);
  const [scorePulse, setScorePulse] = useState<number>(0);

  const {
    cognitiveLevel,
    currentRender,
    currentRenderProps,
    currentResponse,
    dismissStuckIntervention,
    journeyId,
    language,
    predictionHit,
    stuckInterventionVisible,
  } = useElectraStore();

  useScoreDrawerPulseSync(scoreOpen, setScorePulse);
  useCivicBusScoreRewards(setScorePulse);
  useFocusAfterArenaSwap(currentRender, mainRef);
  useSkipLinkFirstTabFocus(skipLinkRef);

  const summary = useMemo((): string => {
    const body = currentResponse.message;
    return body.length > CONTEXT_SUMMARY_PREVIEW_CHAR_LIMIT
      ? `${body.slice(0, CONTEXT_SUMMARY_PREVIEW_CHAR_LIMIT)}...`
      : body;
  }, [currentResponse.message]);

  const arenaMotionKey = `${currentRender}-${currentResponse.stateTransition}`;
  const oracleConfidence = currentResponse.confidence ?? CONTEXT_PANEL_DEFAULT_CONFIDENCE;

  const handleVisualizerToggle = (): void => {
    setVisualizerOpen((current: boolean): boolean => !current);
  };

  const handleSimulatorOpen = (): void => {
    setSimulatorOpen(true);
  };

  const handleScoreOpen = (): void => {
    setScoreOpen(true);
  };

  const handleScoreClose = (): void => {
    setScoreOpen(false);
  };

  const handleSimulatorClose = (): void => {
    setSimulatorOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-3 pb-8 pt-4 md:px-5">
      <AppShellSkipLinkControl skipLinkRef={skipLinkRef} />
      <Header
        language={language}
        onLanguageChange={onLanguageChange}
        onScoreOpen={handleScoreOpen}
        onSignIn={onSignIn}
        onSimulatorOpen={handleSimulatorOpen}
        onVisualizerToggle={handleVisualizerToggle}
        score={scorePulse}
        scoreEnabled={scoreEnabled}
        simulatorEnabled={simulatorEnabled}
        userLabel={userLabel}
        visualizerEnabled={visualizerEnabled}
        visualizerOpen={visualizerOpen}
      />
      <div className="mt-4">
        <ProgressDots step={currentResponse.progress.step} total={currentResponse.progress.total} />
      </div>
      <div ref={mainRef} className="mt-4 flex gap-4" tabIndex={-1}>
        {visualizerEnabled && visualizerOpen ? (
          <aside className="hidden w-[430px] shrink-0 xl:block">
            <JourneyVisualizer
              onExplainStep={(stepName: string): Promise<void> =>
                onAsk(`Explain the civic step: ${stepName}`).catch((err: unknown): void => {
                  logger.error('JourneyVisualizer explain-step prompt failed', err);
                })
              }
            />
          </aside>
        ) : (
          <JourneySidebar />
        )}
        <main className="min-w-0 flex-1">
          <AppShellDemoAnnotationBanner demoAnnotation={demoAnnotation} />
          <div className="mx-auto max-w-[680px] space-y-4">
            <AppShellOracleRail
              busy={busy}
              cognitiveLevel={cognitiveLevel}
              journeyId={journeyId}
              language={language}
              onAsk={onAsk}
              onCognitiveLevelChange={onCognitiveLevelChange}
              onDismissStuck={dismissStuckIntervention}
              onStreamComplete={onStreamComplete}
              onStreamError={onStreamError}
              response={currentResponse}
              streamRequest={streamRequest}
              streamToken={streamToken}
              stuckInterventionVisible={stuckInterventionVisible}
            />
            <AppShellArenaStage
              motionKey={arenaMotionKey}
              prefersReducedMotion={prefersReducedMotion}
              render={currentRender}
              renderProps={currentRenderProps}
            />
          </div>
        </main>
        <ContextPanel
          confidence={oracleConfidence}
          language={language}
          predictionHit={predictionHit}
          summary={summary}
          warning={currentResponse.proactiveWarning}
        />
      </div>
      <div className="mx-auto mt-4 max-w-[680px]">
        <ActionBar
          busy={busy}
          onPrimary={onPrimaryAction}
          onSecondary={onSecondaryAction}
          primaryAction={currentResponse.primaryAction}
          progressLabel={currentResponse.progress.label}
          secondaryAction={currentResponse.secondaryAction}
        />
      </div>
      <CivicScoreCard onClose={handleScoreClose} open={scoreOpen} />
      <AnimatePresence>
        {simulatorOpen && simulatorEnabled ? (
          <ElectionSimulator onClose={handleSimulatorClose} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
