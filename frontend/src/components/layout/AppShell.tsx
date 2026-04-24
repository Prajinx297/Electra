import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Header } from "./Header";
import { ContextPanel } from "./ContextPanel";
import { JourneySidebar } from "../journey/JourneySidebar";
import { ProgressDots } from "../journey/ProgressDots";
import { OraclePanel } from "../oracle/OraclePanel";
import { ActionBar } from "../oracle/ActionBar";
import { ArenaPanel } from "../arena/ArenaPanel";
import { useElectraStore } from "../../engines/stateEngine";
import { focusFirstInteractive } from "../../utils/accessibilityHelpers";
import type { CognitiveLevel, LanguageCode } from "../../types";

interface AppShellProps {
  userLabel: string;
  busy: boolean;
  onAsk: (message: string) => Promise<void>;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onLanguageChange: (language: LanguageCode) => void;
  onCognitiveLevelChange: (level: CognitiveLevel) => void;
  onSignIn: () => Promise<unknown>;
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
  demoAnnotation
}: AppShellProps) => {
  const reducedMotion = useReducedMotion();
  const mainRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);
  const skipLinkRef = useRef<HTMLButtonElement>(null);
  const {
    language,
    cognitiveLevel,
    currentResponse,
    currentRender,
    currentRenderProps,
    predictionHit
  } = useElectraStore();

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    focusFirstInteractive(mainRef.current);
  }, [currentRender]);

  useEffect(() => {
    const handleFirstTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }
      const active = document.activeElement;
      if (active && active !== document.body) {
        return;
      }
      event.preventDefault();
      skipLinkRef.current?.focus();
    };

    window.addEventListener("keydown", handleFirstTab, { once: true });
    return () => window.removeEventListener("keydown", handleFirstTab);
  }, []);

  const summary = useMemo(
    () =>
      currentResponse.message.length > 88
        ? `${currentResponse.message.slice(0, 88)}...`
        : currentResponse.message,
    [currentResponse.message]
  );

  const handleSkipToMain = () => {
    const main = document.getElementById("main-content");
    main?.scrollIntoView({ block: "start" });
    (main as HTMLElement | null)?.focus();
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
        onLanguageChange={onLanguageChange}
        onSignIn={onSignIn}
      />
      <div className="mt-4">
        <ProgressDots
          step={currentResponse.progress.step}
          total={currentResponse.progress.total}
        />
      </div>
      <div id="main-content" ref={mainRef} tabIndex={-1} className="mt-4 flex gap-4">
        <JourneySidebar />
        <main className="min-w-0 flex-1">
          {demoAnnotation ? (
            <div className="mb-4 rounded-[18px] bg-[var(--accent-light)] px-4 py-3 text-sm text-[var(--ink)]">
              {demoAnnotation}
            </div>
          ) : null}
          <div className="mx-auto max-w-[680px] space-y-4">
            <OraclePanel
              response={currentResponse}
              language={language}
              cognitiveLevel={cognitiveLevel}
              onAsk={onAsk}
              onCognitiveLevelChange={onCognitiveLevelChange}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentRender}-${currentResponse.stateTransition}`}
                initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.3 }}
                aria-live="assertive"
              >
                <ArenaPanel render={currentRender} renderProps={currentRenderProps} />
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
    </div>
  );
};
