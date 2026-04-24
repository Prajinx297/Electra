import { useEffect, useMemo, useState } from "react";
import { ensureAnonymousAuth, getCurrentUserToken, signInWithGoogle, subscribeToAuth } from "./firebase/auth";
import { persistSession } from "./firebase/firestore";
import { requestOracle } from "./engines/oracleClient";
import { useElectraStore } from "./engines/stateEngine";
import { AppShell } from "./components/layout/AppShell";
import { AdminPanel } from "./components/layout/AdminPanel";
import { preloadComponent } from "./components/arena/ComponentRegistry";
import {
  buildPauseTracker,
  trackConfusionDetected,
  trackJourneyStarted,
  trackLanguageSwitched,
  trackStepCompleted
} from "./engines/confusionTracker";
import { storeLanguagePreference } from "./utils/validators";
import type { CognitiveLevel, LanguageCode, SessionPayload } from "./types";

const demoPrompts = [
  "I've never voted before. Where do I start?",
  "No, I am not registered yet.",
  "What ID do I need?",
  "Where do I go to vote?",
  "What happens on voting day?"
];

const demoNotes = [
  "This is the Agentic UI choosing the first screen.",
  "Oracle predicted the next step and loaded it early.",
  "This is the rewind-ready journey state changing.",
  "This map is filtered for the next decision only.",
  "This is the final confidence-building step."
];

const App = () => {
  const pathname = window.location.pathname;
  const {
    journeyId,
    currentState,
    currentResponse,
    history,
    oracleHistory,
    cognitiveLevel,
    language,
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
    toggleDemoMode,
    toggleDemoPaused
  } = useElectraStore();

  const [userId, setUserId] = useState("guest");
  const [userLabel, setUserLabel] = useState("Guest mode");
  const [busy, setBusy] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    void ensureAnonymousAuth();
    const unsubscribe = subscribeToAuth((user) => {
      setUserId(user?.uid ?? "guest");
      setUserLabel(user?.displayName ?? (user?.isAnonymous ? "Guest mode" : "Signed in"));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        toggleDemoMode();
      }
      if (event.code === "Space" && demoMode) {
        event.preventDefault();
        toggleDemoPaused();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [demoMode, toggleDemoMode, toggleDemoPaused]);

  const runOracle = async (message: string) => {
    setBusy(true);
    try {
      const token = await getCurrentUserToken();
      const response = await requestOracle(
        {
          userMessage: message,
          currentState,
          history,
          cognitiveLevel,
          language
        },
        token
      );
      await preloadComponent(response.render);
      if (history.length === 1) {
        await trackJourneyStarted(journeyId, cognitiveLevel, language);
      }
      await trackStepCompleted(currentState, Date.now() - pauseStartedAt, false);
      applyOracleResponse(message, response);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!demoMode || demoPaused || demoIndex >= demoPrompts.length || busy) {
      return;
    }
    const timer = window.setTimeout(() => {
      const prompt = demoPrompts[demoIndex];
      void runOracle(prompt);
      setDemoIndex((current) => current + 1);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [busy, demoIndex, demoMode, demoPaused]);

  useEffect(() => {
    if (!demoMode) {
      setDemoIndex(0);
    }
  }, [demoMode]);

  useEffect(() => {
    const tracker = buildPauseTracker(currentState, (stepId) => {
      void trackConfusionDetected(stepId, "long_pause");
    });
    return () => window.clearTimeout(tracker);
  }, [currentState]);

  useEffect(() => {
    const payload: SessionPayload = {
      journeyId,
      currentState,
      stateHistory: history,
      oracleHistory,
      cognitiveLevel,
      language,
      bookmarkedStates,
      completedJourneys
    };
    void persistSession(userId, payload).catch(() => undefined);
  }, [
    bookmarkedStates,
    cognitiveLevel,
    completedJourneys,
    currentState,
    history,
    journeyId,
    language,
    oracleHistory,
    userId
  ]);

  const handlePrimaryAction = async () => {
    const actionText = draftSelection
      ? `${currentResponse.primaryAction.action}: ${draftSelection}`
      : currentResponse.primaryAction.action;
    await runOracle(actionText);
  };

  const handleSecondaryAction = async () => {
    if (!currentResponse.secondaryAction) {
      return;
    }
    await trackConfusionDetected(currentState, "reread");
    await runOracle(currentResponse.secondaryAction.action);
  };

  const handleLanguageChange = async (nextLanguage: LanguageCode) => {
    const previous = language;
    setLanguage(nextLanguage);
    storeLanguagePreference(nextLanguage);
    await trackLanguageSwitched(previous, nextLanguage);
    await runOracle("Please explain the same step in my chosen language.");
  };

  const handleCognitiveLevelChange = async (level: CognitiveLevel) => {
    setCognitiveLevel(level);
    await runOracle("Please explain this same step at my chosen detail level.");
  };

  const demoAnnotation = useMemo(
    () => (demoMode ? demoNotes[Math.min(demoIndex, demoNotes.length - 1)] : null),
    [demoIndex, demoMode]
  );

  if (pathname === "/admin") {
    return <AdminPanel />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <AppShell
        userLabel={userLabel}
        busy={busy}
        onAsk={runOracle}
        onPrimaryAction={handlePrimaryAction}
        onSecondaryAction={handleSecondaryAction}
        onLanguageChange={handleLanguageChange}
        onCognitiveLevelChange={handleCognitiveLevelChange}
        onSignIn={signInWithGoogle}
        demoAnnotation={predictionHit ? "Loaded instantly. Oracle predicted this." : demoAnnotation}
      />
    </div>
  );
};

export default App;
