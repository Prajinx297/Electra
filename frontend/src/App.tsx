import { lazy, StrictMode, Suspense } from 'react';
import type { ReactNode } from 'react';

import { OracleErrorBoundary } from '@/components/errors/OracleErrorBoundary';

import { useAdaptiveCopilot } from './features/copilot/useAdaptiveCopilot';
import { useAppOrchestrator } from './features/core/useAppOrchestrator';
import { signInWithGoogle } from './firebase/auth';

const AdminPanel = lazy(async () =>
  import('./components/layout/AdminPanel').then((module) => ({ default: module.AdminPanel })),
);
const AppShell = lazy(async () =>
  import('./components/layout/AppShell').then((module) => ({ default: module.AppShell })),
);
const OnboardingEngine = lazy(async () =>
  import('./features/onboarding/OnboardingEngine').then((module) => ({
    default: module.OnboardingEngine,
  })),
);

/**
 * Full-screen loading state shown during lazy component loading.
 *
 * @returns Accessible loading skeleton shell.
 * @throws {Error} Never thrown directly.
 */
function GlobalLoadingScreen(): ReactNode {
  return (
    <div role="status" aria-label="Loading Electra..." className="flex h-screen items-center justify-center">
      <span className="sr-only">Loading civic intelligence system...</span>
    </div>
  );
}

/**
 * Root application component for Electra Civic Intelligence OS.
 * Sets up StrictMode, error boundaries, and accessibility landmarks.
 *
 * @returns The fully initialized Electra application tree.
 * @throws {Error} Rendering errors are handled by `OracleErrorBoundary`.
 */
export default function App(): ReactNode {
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
    return (
      <StrictMode>
        <OracleErrorBoundary>
          <Suspense fallback={<GlobalLoadingScreen />}>
            <AdminPanel />
          </Suspense>
        </OracleErrorBoundary>
      </StrictMode>
    );
  }

  if (!profile) {
    return (
      <StrictMode>
        <OracleErrorBoundary>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-lg"
          >
            Skip to main content
          </a>
          <main id="main-content" tabIndex={-1}>
            <Suspense fallback={<GlobalLoadingScreen />}>
              <OnboardingEngine onComplete={handleOnboardingComplete} />
            </Suspense>
          </main>
        </OracleErrorBoundary>
      </StrictMode>
    );
  }

  return (
    <StrictMode>
      <OracleErrorBoundary>
        <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-lg"
          >
            Skip to main content
          </a>
          <main id="main-content" tabIndex={-1}>
            <Suspense fallback={<GlobalLoadingScreen />}>
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
            </Suspense>
          </main>
        </div>
      </OracleErrorBoundary>
    </StrictMode>
  );
}
