import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDoc, collection, doc, getDoc, setDoc } from "firebase/firestore";
import {
  flagSourceAsOutdated,
  loadSession,
  persistConversationTurn,
  persistOnboardingProfile,
  persistSession
} from "../../src/firebase/firestore";
import type { OracleHistoryEntry, SessionPayload } from "../../src/types";

const session: SessionPayload = {
  journeyId: "journey-1",
  currentState: "WELCOME",
  stateHistory: [],
  oracleHistory: [],
  cognitiveLevel: "citizen",
  language: "en",
  bookmarkedStates: [],
  completedJourneys: [],
  profile: null
};

const turn: OracleHistoryEntry = {
  prompt: "help",
  timestamp: "2026-04-30T00:00:00.000Z",
  predictionHit: true,
  response: {
    message: "Next step.",
    tone: "warm",
    render: "DecisionCard",
    renderProps: {},
    primaryAction: { label: "Next", action: "next" },
    secondaryAction: null,
    progress: { step: 1, total: 7, label: "Start" },
    proactiveWarning: null,
    stateTransition: "WELCOME",
    cognitiveLevel: "citizen",
    nextAnticipated: "GoalSelect"
  }
};

describe("firestore persistence helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persistSession writes the typed session shape with merge enabled", async () => {
    await persistSession("user-1", session);

    expect(doc).toHaveBeenCalledWith(expect.anything(), "sessions", "user-1");
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ journeyId: "journey-1", updatedAt: "server-time" }),
      { merge: true }
    );
  });

  it("loadSession returns a typed session when the document exists", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => session
    } as never);

    await expect(loadSession("user-1")).resolves.toEqual(session);
  });

  it("loadSession returns null when no session document exists", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => null
    } as never);

    await expect(loadSession("missing-user")).resolves.toBeNull();
  });

  it("persistConversationTurn appends the turn to a session conversation collection", async () => {
    await persistConversationTurn("user-1", "journey-1", turn);

    expect(collection).toHaveBeenCalledWith(expect.anything(), "sessions", "user-1", "conversations");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sessionId: "journey-1", prompt: "help", createdAt: "server-time" })
    );
  });

  it("persistOnboardingProfile stores tone and accessibility needs", async () => {
    await persistOnboardingProfile("user-1", {
      location: "Phoenix, AZ",
      familiarity: "confident",
      accessibilityNeeds: ["Mobility"],
      toneMode: "policy-expert",
      completedAt: "2026-04-30T00:00:00.000Z"
    });

    expect(doc).toHaveBeenCalledWith(expect.anything(), "onboardingProfiles", "user-1");
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toneMode: "policy-expert", accessibilityNeeds: ["Mobility"] }),
      { merge: true }
    );
  });

  it("flagSourceAsOutdated writes to the review queue", async () => {
    await flagSourceAsOutdated({
      sessionId: "session-1",
      sourceId: "usa-gov-voting",
      reason: "Looks stale"
    });

    expect(collection).toHaveBeenCalledWith(expect.anything(), "reviewQueue");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sourceId: "usa-gov-voting", createdAt: "server-time" })
    );
  });
});
