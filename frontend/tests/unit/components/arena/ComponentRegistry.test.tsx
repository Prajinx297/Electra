import { describe, expect, it } from "vitest";
import { getComponent, preloadComponent } from "../../../../src/components/arena/ComponentRegistry";
import type { RenderKey } from "../../../../src/types";

const renderKeys: RenderKey[] = [
  "WelcomeStep",
  "GoalSelect",
  "DecisionCard",
  "RegistrationChecker",
  "DeadlineCalculator",
  "IDChecker",
  "PollingFinder",
  "BallotWalkthrough",
  "VoteCounter",
  "ConsequenceTree",
  "AccessibilitySupport",
  "JourneySummary",
  "StatusSummary",
  "JourneyGraph"
];

describe("ComponentRegistry", () => {
  it("returns lazy components and preloads known render keys", async () => {
    for (const key of renderKeys) {
      expect(getComponent(key)).toBeDefined();
      await expect(preloadComponent(key)).resolves.toHaveProperty("default");
    }
    await expect(preloadComponent(null)).resolves.toBeUndefined();
  });

  it("falls back for unknown render keys", async () => {
    await expect(preloadComponent("UnknownRender" as RenderKey)).resolves.toHaveProperty("default");
    expect(getComponent("UnknownRender" as RenderKey)).toBeDefined();
  });
});
