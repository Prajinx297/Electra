import { AppShell } from "./components/layout/AppShell";
import { AdminPanel } from "./components/layout/AdminPanel";
import { useAdaptiveCopilot } from "./features/copilot/useAdaptiveCopilot";
import { OnboardingEngine } from "./features/onboarding/OnboardingEngine";
import { signInWithGoogle } from "./firebase/auth";
import { useAppOrchestrator } from "./features/core/useAppOrchestrator";

export const App = () => {
  const pathname = window.location.pathname;
  const {
    profile, userLabel, busy, streamRequest, streamToken, predictionHit, demoAnnotation,
    runOracle, handlePrimaryAction, handleSecondaryAction, handleLanguageChange,
    handleCognitiveLevelChange, handleStreamComplete, handleStreamError, handleOnboardingComplete
  } = useAppOrchestrator();

  useAdaptiveCopilot();

  if (pathname === "/admin") {
    return <AdminPanel />;
  }

  if (!profile) {
    return <OnboardingEngine onComplete={handleOnboardingComplete} />;
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
        streamRequest={streamRequest}
        streamToken={streamToken}
        onStreamComplete={handleStreamComplete}
        onStreamError={handleStreamError}
        demoAnnotation={predictionHit ? "Loaded instantly. Oracle predicted this." : (demoAnnotation ?? null)}
      />
    </div>
  );
};

export default App;
