import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useElectraStore } from '../../engines/stateEngine';
import { civicBus } from '../../events/civicEventBus';
import { CivicScoreCard } from '../../features/civic-score/CivicScoreCard';
import { JourneyVisualizer } from '../../features/journey/JourneyVisualizer';
import { ElectionSimulator } from '../../features/simulator/ElectionSimulator';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import type { CognitiveLevel, LanguageCode, OracleRequest, OracleResponse } from '../../types';
import { focusFirstInteractive } from '../../utils/accessibilityHelpers';
import { ArenaPanel } from '../arena/ArenaPanel';
import { OracleErrorBoundary } from '../errors/OracleErrorBoundary';
import { JourneySidebar } from '../journey/JourneySidebar';
import { ProgressDots } from '../journey/ProgressDots';
import { ActionBar } from '../oracle/ActionBar';
import { OraclePanel } from '../oracle/OraclePanel';

import { ContextPanel } from './ContextPanel';
import { Header } from './Header';

interface AppShellProps {
  userLabel: string;
  busy: boolean;
  onAsk: (message: string) => Promise<void>;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onLanguageChange: (language: LanguageCode) => void;
  onCognitiveLevelChange: (level: CognitiveLevel) => void;
  onSignIn: () => Promise<unknown>;
  streamRequest?: OracleRequest | null;
  streamToken?: string | null;
  onStreamComplete?: (response: OracleResponse) => void;
  onStreamError?: (message: string) => void;
  demoAnnotation: string | null;
}

export const AppShell = ({
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
  onStreamComplete = () => {},
  onStreamError = () => {},
  demoAnnotation,
}: AppShellProps) => {
  const reducedMotion = useReducedMotion();
  const visualizerEnabled = useFeatureFlag('journey_visualizer_enabled');
  const simulatorEnabled = useFeatureFlag('election_simulator_enabled');
  const scoreEnabled = useFeatureFlag('civic_score_enabled');
  const mainRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);
  const skipLinkRef = useRef<HTMLButtonElement>(null);
  const [visualizerOpen, setVisualizerOpen] = useState(true);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [scorePulse, setScorePulse] = useState(0);
  const {
    language,
    cognitiveLevel,
    currentResponse,
    currentRender,
    currentRenderProps,
    predictionHit,
    journeyId,
    stuckInterventionVisible,
    dismissStuckIntervention,
  } = useElectraStore();

  useEffect(() => {
    const readScore = () => {
      const raw = window.localStorage.getItem('electra:civic-score');
      if (!raw) {
        return 0;
      }
      try {
        const parsed = JSON.parse(raw) as { score?: number };
        return parsed.score ?? 0;
      } catch {
        return 0;
      }
    };

    setScorePulse(readScore());
  }, [scoreOpen]);

  useEffect(() => {
    const applyScore = (points: number) => {
      const raw = window.localStorage.getItem('electra:civic-score');
      let currentScore = 0;
      let streakDays = 1;

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { score?: number; streakDays?: number };
          currentScore = parsed.score ?? 0;
          streakDays = parsed.streakDays ?? 1;
        } catch {
          currentScore = 0;
        }
      }

      const nextScore = currentScore + points;
      window.localStorage.setItem(
        'electra:civic-score',
        JSON.stringify({
          score: nextScore,
          badges: [],
          streakDays,
          highestBadge: null,
        }),
      );
      setScorePulse(nextScore);
    };

    const unsubscribeOracle = civicBus.on('ORACLE_RESPONSE', () => applyScore(10));
    const unsubscribeStep = civicBus.on('STEP_COMPLETED', () => applyScore(25));
    const unsubscribeConfusion = civicBus.on('CONFUSION_DETECTED', () => applyScore(5));
    const unsubscribeScore = civicBus.on('SCORE_EARNED', ({ points }) => applyScore(points));

    return () => {
      unsubscribeOracle();
      unsubscribeStep();
      unsubscribeConfusion();
      unsubscribeScore();
    };
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    focusFirstInteractive(mainRef.current);
  }, [currentRender]);

  useEffect(() => {
    const handleFirstTab = (event: KeyboardEvent) => {
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
    return () => window.removeEventListener('keydown', handleFirstTab);
  }, []);

  const summary = useMemo(
    () =>
      currentResponse.message.length > 88
        ? `${currentResponse.message.slice(0, 88)}...`
        : currentResponse.message,
    [currentResponse.message],
  );

  const handleSkipToMain = () => {
    const main = document.getElementById('main-content');
    main?.scrollIntoView({ block: 'start' });
    main?.focus();
  };

  return (
    <div className="mx-auto max-w-[1440px] px-3 pb-8 pt-4 md:px-5">
      <button
        type="button"
        ref={skipLinkRef}
        onClick={handleSkipToMain}
        className="absolute left-4 top-4 rounded-full bg-[var(--civic-green)] px-4 py-2 text-white"
      >
        Skip to main content
      </button>
      <Header
        language={language}
        userLabel={userLabel}
        visualizerOpen={visualizerOpen}
        visualizerEnabled={visualizerEnabled}
        simulatorEnabled={simulatorEnabled}
        scoreEnabled={scoreEnabled}
        score={scorePulse}
        onLanguageChange={onLanguageChange}
        onVisualizerToggle={() => setVisualizerOpen((current) => !current)}
        onSimulatorOpen={() => setSimulatorOpen(true)}
        onScoreOpen={() => setScoreOpen(true)}
        onSignIn={onSignIn}
      />
      <div className="mt-4">
        <ProgressDots step={currentResponse.progress.step} total={currentResponse.progress.total} />
      </div>
      <div ref={mainRef} tabIndex={-1} className="mt-4 flex gap-4">
        {visualizerEnabled && visualizerOpen ? (
          <aside className="hidden w-[430px] shrink-0 xl:block">
            <JourneyVisualizer
              onExplainStep={(stepName) => onAsk(`Explain the civic step: ${stepName}`)}
            />
          </aside>
        ) : (
          <JourneySidebar />
        )}
        <main className="min-w-0 flex-1">
          {demoAnnotation ? (
            <div className="mb-4 rounded-[18px] bg-[var(--accent-light)] px-4 py-3 text-sm text-[var(--ink)]">
              {demoAnnotation}
            </div>
          ) : null}
          <div className="mx-auto max-w-[680px] space-y-4">
            <div role="status" aria-label="Oracle is thinking..." aria-busy={busy}>
              <OracleErrorBoundary>
                <OraclePanel
                  response={currentResponse}
                  language={language}
                  cognitiveLevel={cognitiveLevel}
                  busy={busy}
                  sessionId={journeyId}
                  stuckInterventionVisible={stuckInterventionVisible}
                  streamRequest={streamRequest}
                  streamToken={streamToken}
                  onStreamComplete={onStreamComplete}
                  onStreamError={onStreamError}
                  onAsk={onAsk}
                  onCognitiveLevelChange={onCognitiveLevelChange}
                  onDismissStuck={dismissStuckIntervention}
                />
              </OracleErrorBoundary>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentRender}-${currentResponse.stateTransition}`}
                {...(reducedMotion
                  ? {}
                  : {
                      initial: { opacity: 0, y: 8 },
                      animate: { opacity: 1, y: 0 },
                      exit: { opacity: 0 },
                    })}
                transition={{ duration: reducedMotion ? 0 : 0.3 }}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <OracleErrorBoundary>
                  <ArenaPanel render={currentRender} renderProps={currentRenderProps} />
                </OracleErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <ContextPanel
          language={language}
          summary={summary}
          warning={currentResponse.proactiveWarning}
          confidence={currentResponse.confidence ?? 0.97}
          predictionHit={predictionHit}
        />
      </div>
      <div className="mx-auto mt-4 max-w-[680px]">
        <ActionBar
          primaryAction={currentResponse.primaryAction}
          secondaryAction={currentResponse.secondaryAction}
          progressLabel={currentResponse.progress.label}
          busy={busy}
          onPrimary={onPrimaryAction}
          onSecondary={onSecondaryAction}
        />
      </div>
      <CivicScoreCard open={scoreOpen} onClose={() => setScoreOpen(false)} />
      <AnimatePresence>
        {simulatorOpen && simulatorEnabled ? (
          <ElectionSimulator onClose={() => setSimulatorOpen(false)} />
        ) : null}
      </AnimatePresence>
    </div>
  );
};
