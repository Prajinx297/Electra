import { afterEach, describe, expect, it, vi } from "vitest";

describe("Firebase service wrappers", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("logs civic analytics events through Firebase Analytics", async () => {
    const fbLogEvent = vi.fn();
    vi.doMock("firebase/analytics", () => ({ logEvent: fbLogEvent }));
    vi.doMock("../../src/firebase/config", () => ({ analytics: { app: "analytics" } }));

    const analytics = await import("../../src/firebase/analytics");

    analytics.trackConfusionTime("WELCOME", 12);
    analytics.trackOracleReread("ID_CHECK");
    analytics.trackDetailRequested("POLLING_FINDER");
    analytics.trackNavigatedBack("WELCOME");
    analytics.trackPredictionHit("DeadlineCalculator");
    await analytics.trackEvent("custom_event", { ok: true });
    analytics.civicEvents.onboardingCompleted("citizen", "Atlanta");
    analytics.civicEvents.oracleQueried("citizen", "WELCOME");
    analytics.civicEvents.journeyStepCompleted("WELCOME", 7);
    analytics.civicEvents.simulatorCompleted(true);
    analytics.civicEvents.civicScoreShared(250, "Informed Voter");
    analytics.civicEvents.sourceOutdatedFlagged("USAGov");
    analytics.civicEvents.languageChanged("en", "es");

    expect(fbLogEvent).toHaveBeenCalledWith(
      { app: "analytics" },
      "civic_score_shared",
      { score: 250, badge: "Informed Voter" }
    );
    expect(fbLogEvent).toHaveBeenCalledTimes(13);
  });

  it("fetches Remote Config and exposes typed flag helpers", async () => {
    const remoteConfig = { settings: {}, defaultConfig: {} };
    const fetchAndActivate = vi.fn().mockResolvedValue(true);
    const getValue = vi.fn((_config: unknown, key: string) => ({
      asBoolean: () => key !== "simulator_anomaly_injection",
      asString: () => `value:${key}`,
      asNumber: () => 42
    }));

    vi.doMock("firebase/remote-config", () => ({
      fetchAndActivate,
      getRemoteConfig: vi.fn(() => remoteConfig),
      getValue
    }));
    vi.doMock("../../src/firebase/config", () => ({ app: { name: "electra" } }));

    const config = await import("../../src/firebase/remoteConfig");

    await config.initRemoteConfig();

    expect(fetchAndActivate).toHaveBeenCalledWith(remoteConfig);
    expect(config.getFeatureFlag("election_simulator_enabled")).toBe(true);
    expect(config.getConfigValue("max_oracle_questions_per_session")).toBe(
      "value:max_oracle_questions_per_session"
    );
    expect(config.getConfigNumber("max_oracle_questions_per_session")).toBe(42);
  });

  it("records Performance Monitoring traces for success and error paths", async () => {
    const traceInstance = {
      start: vi.fn(),
      stop: vi.fn(),
      putMetric: vi.fn()
    };
    vi.doMock("firebase/performance", () => ({
      getPerformance: vi.fn(() => ({ app: "perf" })),
      trace: vi.fn(() => traceInstance)
    }));
    vi.doMock("../../src/firebase/config", () => ({ app: { name: "electra" } }));

    const performance = await import("../../src/firebase/performance");

    await expect(performance.measureOracleLatency(async () => "ok")).resolves.toBe("ok");
    await expect(
      performance.measureOracleLatency(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    performance.measureStreamingLatency().start();
    performance.measureJourneyStepTime("ID_CHECK")();

    expect(traceInstance.putMetric).toHaveBeenCalledWith("success", 1);
    expect(traceInstance.putMetric).toHaveBeenCalledWith("error", 1);
    expect(traceInstance.stop).toHaveBeenCalled();
  });
});
