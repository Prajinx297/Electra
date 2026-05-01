import { describe, expect, it, vi } from "vitest";
import {
  predictNextRender,
  prefetchNext,
  scorePrediction,
  verifyPredictionHit
} from "../../src/engines/predictionEngine";
import { preloadComponent } from "../../src/components/arena/ComponentRegistry";
import { trackEvent } from "../../src/firebase/analytics";

vi.mock("../../src/components/arena/ComponentRegistry", () => ({
  preloadComponent: vi.fn().mockResolvedValue({ default: () => null })
}));

vi.mock("../../src/firebase/analytics", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined)
}));

describe("predictionEngine", () => {
  it("predicts the next render for known journey states", () => {
    expect(predictNextRender("WELCOME")).toBe("GoalSelect");
    expect(predictNextRender("ID_CHECK")).toBe("IDChecker");
    expect(predictNextRender("COMPLETE")).toBe("DecisionCard");
  });

  it("scores hits and misses without producing impossible confidence totals", () => {
    expect(scorePrediction("GoalSelect", "GoalSelect")).toEqual({ hit: true });
    expect(scorePrediction("GoalSelect", "DecisionCard")).toEqual({ hit: false });
    expect(verifyPredictionHit("PollingFinder")).toBe(true);
    expect(trackEvent).toHaveBeenCalledWith("prediction_hit", expect.any(Object));
  });

  it("prefetches high-confidence predicted components", async () => {
    await prefetchNext("VoteCounter");
    expect(preloadComponent).toHaveBeenCalledWith("VoteCounter");
  });
});
