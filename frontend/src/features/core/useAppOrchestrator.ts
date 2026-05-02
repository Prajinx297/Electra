import { useCallback, useEffect, useMemo, useState } from 'react';

import { preloadComponent } from '../../components/arena/ComponentRegistry';
import {
  buildPauseTracker,
  trackConfusionDetected,
  trackJourneyStarted,
  trackLanguageSwitched,
  trackStepCompleted,
} from '../../engines/confusionTracker';
import { useElectraStore } from '../../engines/stateEngine';
import { civicBus } from '../../events/civicEventBus';
import { civicEvents } from '../../firebase/analytics';
import { ensureAnonymousAuth, getCurrentUserToken, subscribeToAuth } from '../../firebase/auth';
import { persistConversationTurn, persistOnboardingProfile } from '../../firebase/firestore';
import { measureJourneyStepTime } from '../../firebase/performance';
import { useSessionSync } from '../../hooks/useSessionSync';
import type {
  CognitiveLevel,
  LanguageCode,
  OnboardingProfile,
  OracleRequest,
  OracleResponse,
  SessionPayload,
} from '../../types';
import { storeLanguagePreference } from '../../utils/validators';

const demoPrompts = [
  "I've never voted before. Where do I start?",
  'No, I am not registered yet.',
  'What ID do I need?',
  'Where do I go to vote?',
  'What happens on voting day?',
];

const demoNotes = [
  'This is the Agentic UI choosing the first screen.',
  'Oracle predicted the next step and loaded it early.',
  'This is the rewind-ready journey state changing.',
  'This map is filtered for the next decision only.',
  'This is the final confidence-building step.',
];

export const useAppOrchestrator = () => {
  const store = useElectraStore();
  const {
    journeyId,
    currentState,
    currentResponse,
    history,
    oracleHistory,
    cognitiveLevel,
    language,
    profile,
    bookmarkedStates,
    completedJourneys,
    predictionHit,
    pauseStartedAt,
    demoMode,
    demoPaused,
    draftSelection,
    setLanguage,
    setCognitiveLevel,
    applyOracleResponse,
    completeOnboarding,
    toggleDemoMode,
    toggleDemoPaused,
  } = store;

  const [userId, setUserId] = useState('guest');
  const [userLabel, setUserLabel] = useState('Guest mode');
  const [busy, setBusy] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const [streamRequest, setStreamRequest] = useState<OracleRequest | null>(null);
  const [streamPrompt, setStreamPrompt] = useState('');
  const [streamToken, setStreamToken] = useState<string | null>(null);

  useEffect(() => {
    void ensureAnonymousAuth();
    const unsubscribe = subscribeToAuth((user) => {
      setUserId(user?.uid ?? 'guest');
      setUserLabel(user?.displayName ?? (user?.isAnonymous ? 'Guest mode' : 'Signed in'));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        toggleDemoMode();
      }
      if (event.code === 'Space' && demoMode) {
        event.preventDefault();
        toggleDemoPaused();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [demoMode, toggleDemoMode, toggleDemoPaused]);

  const runOracle = useCallback(
    async (
      message: string,
      requestOverrides: Partial<Pick<OracleRequest, 'language' | 'cognitiveLevel'>> = {},
    ) => {
      setBusy(true);
      try {
        const token = await getCurrentUserToken();
        const payload: OracleRequest = {
          userMessage: message,
          currentState,
          history: history.slice(-3), // TODO: Move to strict token budget in backend
          cognitiveLevel: requestOverrides.cognitiveLevel ?? cognitiveLevel,
          language: requestOverrides.language ?? language,
          sessionId: journeyId,
          profile,
        };
        civicEvents.oracleQueried(requestOverrides.cognitiveLevel ?? cognitiveLevel, currentState);
        setStreamPrompt(message);
        setStreamToken(token);
        setStreamRequest(payload);
      } catch {
        setBusy(false);
      }
    },
    [cognitiveLevel, currentState, history, journeyId, language, profile],
  );

  useEffect(() => {
    if (!demoMode || demoPaused || demoIndex >= demoPrompts.length || busy) {
      return;
    }
    const timer = window.setTimeout(() => {
      const prompt = demoPrompts[demoIndex] ?? '';
      if (prompt) void runOracle(prompt);
      setDemoIndex((current) => current + 1);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [busy, demoIndex, demoMode, demoPaused, runOracle]);

  useEffect(() => {
    if (!demoMode) setDemoIndex(0);
  }, [demoMode]);

  useEffect(() => {
    const tracker = buildPauseTracker(currentState, (stepId) => {
      void trackConfusionDetected(stepId, 'long_pause');
      civicBus.emit({ type: 'CONFUSION_DETECTED', payload: { stepId, level: 1 } });
    });
    return () => window.clearTimeout(tracker);
  }, [currentState]);

  useEffect(() => measureJourneyStepTime(currentState), [currentState]);

  const sessionPayload = useMemo<SessionPayload>(
    () => ({
      journeyId,
      currentState,
      stateHistory: history,
      oracleHistory,
      cognitiveLevel,
      language,
      bookmarkedStates,
      completedJourneys,
      profile,
    }),
    [
      journeyId,
      currentState,
      history,
      oracleHistory,
      cognitiveLevel,
      language,
      bookmarkedStates,
      completedJourneys,
      profile,
    ],
  );

  useSessionSync(userId, sessionPayload);

  const handleOnboardingComplete = useCallback(
    async (nextProfile: OnboardingProfile) => {
      completeOnboarding(nextProfile);
      civicEvents.onboardingCompleted(nextProfile.toneMode, nextProfile.location);
      // REMOVED localStorage mutation to fix split-brain
      civicBus.emit({
        type: 'SCORE_EARNED',
        payload: { points: 50, reason: 'Complete onboarding' },
      });
      await persistOnboardingProfile(userId, nextProfile);
    },
    [completeOnboarding, userId],
  );

  const handleStreamComplete = useCallback(
    async (response: OracleResponse) => {
      await preloadComponent(response.render);
      if (history.length === 1) await trackJourneyStarted(journeyId, cognitiveLevel, language);

      const durationMs = Date.now() - pauseStartedAt;
      await trackStepCompleted(currentState, durationMs, false);
      civicEvents.journeyStepCompleted(currentState, Math.round(durationMs / 1000));
      applyOracleResponse(streamPrompt, response);
      await persistConversationTurn(userId, journeyId, {
        prompt: streamPrompt,
        response,
        timestamp: new Date().toISOString(),
        predictionHit,
      });

      setStreamRequest(null);
      setStreamPrompt('');
      setBusy(false);
    },
    [
      applyOracleResponse,
      cognitiveLevel,
      currentState,
      history.length,
      journeyId,
      language,
      pauseStartedAt,
      predictionHit,
      streamPrompt,
      userId,
    ],
  );

  const handleStreamError = useCallback(() => setBusy(false), []);

  const handlePrimaryAction = useCallback(async () => {
    const actionText = draftSelection
      ? `${currentResponse.primaryAction.action}: ${draftSelection}`
      : currentResponse.primaryAction.action;
    await runOracle(actionText);
  }, [draftSelection, currentResponse?.primaryAction?.action, runOracle]);

  const handleSecondaryAction = useCallback(async () => {
    if (!currentResponse?.secondaryAction) return;
    await trackConfusionDetected(currentState, 'reread');
    await runOracle(currentResponse.secondaryAction.action);
  }, [currentResponse?.secondaryAction, currentState, runOracle]);

  const handleLanguageChange = useCallback(
    async (nextLanguage: LanguageCode) => {
      const previous = language;
      setLanguage(nextLanguage);
      storeLanguagePreference(nextLanguage);
      await trackLanguageSwitched(previous, nextLanguage);
      civicEvents.languageChanged(previous, nextLanguage);
      if (profile)
        await persistOnboardingProfile(userId, { ...profile, preferredLanguage: nextLanguage });
      await runOracle('Please explain the same step in my chosen language.', {
        language: nextLanguage,
      });
    },
    [language, profile, setLanguage, runOracle, userId],
  );

  const handleCognitiveLevelChange = useCallback(
    async (level: CognitiveLevel) => {
      setCognitiveLevel(level);
      await runOracle('Please explain this same step at my chosen detail level.', {
        cognitiveLevel: level,
      });
    },
    [setCognitiveLevel, runOracle],
  );

  const demoAnnotation = useMemo(
    () => (demoMode ? demoNotes[Math.min(demoIndex, demoNotes.length - 1)] : null),
    [demoIndex, demoMode],
  );

  return {
    profile,
    userLabel,
    busy,
    streamRequest,
    streamToken,
    predictionHit,
    demoAnnotation,
    runOracle,
    handlePrimaryAction,
    handleSecondaryAction,
    handleLanguageChange,
    handleCognitiveLevelChange,
    handleStreamComplete,
    handleStreamError,
    handleOnboardingComplete,
  };
};
