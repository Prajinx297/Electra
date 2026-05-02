import { AdminPanel } from './components/layout/AdminPanel';
import { AppShell } from './components/layout/AppShell';
import { useAdaptiveCopilot } from './features/copilot/useAdaptiveCopilot';
import { useAppOrchestrator } from './features/core/useAppOrchestrator';
import { OnboardingEngine } from './features/onboarding/OnboardingEngine';
import { signInWithGoogle } from './firebase/auth';

const App = (): JSX.Element => {
  const pathname = window.location.pathname;
  const {
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
  } = useAppOrchestrator();

  useAdaptiveCopilot();

  if (pathname === '/admin') {
    return <AdminPanel />;
  }

  if (!profile) {
    return (
      <>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-2 focus:text-black"
        >
          Skip to main content
        </a>
        <main id="main-content" tabIndex={-1}>
          <OnboardingEngine onComplete={handleOnboardingComplete} />
        </main>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-2 focus:text-black"
      >
        Skip to main content
      </a>
      <main id="main-content" tabIndex={-1}>
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
          demoAnnotation={
            predictionHit ? 'Loaded instantly. Oracle predicted this.' : (demoAnnotation ?? null)
          }
        />
      </main>
    </div>
  );
};

export default App;
