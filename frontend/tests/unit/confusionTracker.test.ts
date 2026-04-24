import { describe, expect, it, vi } from "vitest";
import {
  buildPauseTracker,
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
});
