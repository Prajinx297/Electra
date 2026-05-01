import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { render } from "@testing-library/react";
import {
  buildPauseTracker,
  useConfusionTimer,
  useOracleScrollTracker,
  trackConfusionDetected,
  trackJourneyStarted,
  trackLanguageSwitched,
  trackSimulationInteracted,
  trackStepCompleted
} from "../../src/engines/confusionTracker";
import { trackEvent } from "../../src/firebase/analytics";

vi.mock("../../src/firebase/analytics", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined)
}));

describe("confusion tracker", () => {
  it("sends analytics events", async () => {
    await trackJourneyStarted("journey-1", "simple", "en");
    await trackStepCompleted("WELCOME", 1200, false);
    await trackConfusionDetected("ID_CHECK", "back");
    await trackSimulationInteracted("vote-counter", "3 sliders");
    await trackLanguageSwitched("en", "es");

    expect(trackEvent).toHaveBeenCalledTimes(5);
  });

  it("creates a pause tracker timer", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    buildPauseTracker("WELCOME", spy, 100);
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledWith("WELCOME");
    vi.useRealTimers();
  });

  it("records time spent when a step unmounts", () => {
    vi.useFakeTimers();
    const Harness = () => {
      useConfusionTimer("WELCOME");
      return null;
    };

    const { unmount } = render(React.createElement(Harness));
    vi.advanceTimersByTime(2300);
    unmount();

    expect(trackEvent).toHaveBeenCalledWith("confusion_time_spent", {
      stepId: "WELCOME",
      seconds: 2
    });
    vi.useRealTimers();
  });

  it("fires a reread analytics event when an observed oracle re-enters view", () => {
    let observerCallback: IntersectionObserverCallback = () => undefined;
    class IntersectionObserverMock {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();

      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

    const Harness = () => {
      const ref = useOracleScrollTracker("ID_CHECK");
      return React.createElement("div", { ref }, "Oracle content");
    };

    render(React.createElement(Harness));
    observerCallback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);

    expect(trackEvent).toHaveBeenCalledWith("oracle_reread", { stepId: "ID_CHECK" });
    vi.unstubAllGlobals();
  });
});
