import { beforeEach, describe, expect, it } from "vitest";
import {
  JOURNEY_GRAPH,
  JOURNEY_STATES,
  buildHistoryEntry,
  canTransition,
  resolveNextState,
  useElectraStore
} from "../../src/engines/stateEngine";

describe("state engine", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
  });

  it("covers all 45 journey states", () => {
    expect(JOURNEY_STATES.length).toBeGreaterThanOrEqual(45);
  });

  it("allows every declared transition", () => {
    JOURNEY_STATES.forEach((state) => {
      JOURNEY_GRAPH[state].allowedTransitions.forEach((next) => {
        expect(canTransition(state, next)).toBe(true);
        expect(resolveNextState(state, next)).toBe(next);
      });
    });
  });

  it("blocks skipping required states", () => {
    expect(canTransition("WELCOME", "COUNTING_EXPLAINED")).toBe(false);
    expect(resolveNextState("WELCOME", "COUNTING_EXPLAINED")).toBe("WELCOME");
  });

  it("exposes recovery paths from error states", () => {
    expect(JOURNEY_GRAPH.DEADLINE_PASSED.recoveryPaths).toContain("BACKUP_VOTE_OPTION");
    expect(JOURNEY_GRAPH.ID_ISSUE.recoveryPaths).toContain("AT_POLLS");
  });

  it("applies oracle responses and rewinds to a saved state", () => {
    useElectraStore.getState().applyOracleResponse("first time voter", {
      message: "We will start by checking registration.",
      tone: "warm",
      render: "RegistrationChecker",
      renderProps: {},
      primaryAction: { label: "Check", action: "check my registration" },
      secondaryAction: null,
      progress: { step: 2, total: 7, label: "Checking registration" },
      proactiveWarning: null,
      stateTransition: "REGISTRATION_CHECK",
      cognitiveLevel: "simple",
      nextAnticipated: "DeadlineCalculator"
    });

    useElectraStore.getState().rewindToState("WELCOME");
    expect(useElectraStore.getState().currentState).toBe("WELCOME");
  });

  it("builds a history entry with rewind support", () => {
    const entry = buildHistoryEntry("ID_CHECK", "Check my ID", {
      message: "Check your ID now.",
      tone: "warm",
      render: "IDChecker",
      renderProps: {},
      primaryAction: { label: "Check", action: "check id" },
      secondaryAction: null,
      progress: { step: 4, total: 7, label: "Checking ID" },
      proactiveWarning: null,
      stateTransition: "ID_CHECK",
      cognitiveLevel: "simple",
      nextAnticipated: "PollingFinder"
    }, true);

    expect(entry.rewound).toBe(true);
    expect(entry.render).toBe("IDChecker");
  });

  it("supports bookmarks, demo mode, language, and hydration", () => {
    const store = useElectraStore.getState();
    store.bookmarkState("WELCOME");
    store.toggleDemoMode();
    store.toggleDemoPaused();
    store.setDraftSelection("I have never voted before");
    store.setLanguage("es");
    store.setCognitiveLevel("detailed");
    store.hydrateSession({
      currentState: "GOAL_SELECT",
      bookmarkedStates: ["WELCOME"]
    });

    const next = useElectraStore.getState();
    expect(next.bookmarkedStates).toContain("WELCOME");
    expect(next.demoMode).toBe(true);
    expect(next.demoPaused).toBe(true);
    expect(next.draftSelection).toBe("I have never voted before");
    expect(next.language).toBe("es");
    expect(next.cognitiveLevel).toBe("detailed");
    expect(next.currentState).toBe("GOAL_SELECT");
  });
});
