import { describe, expect, it } from "vitest";
import {
  buildBallotStages,
  buildVoteCountFrames,
  calculateDeadline,
  calculateRecountTrigger,
  evaluateIdAnswers
} from "../../src/engines/simulationEngine";

describe("simulation engine", () => {
  it("builds integer-only vote counting frames", () => {
    const frames = buildVoteCountFrames({
      regionSize: 9000,
      candidateCount: 2,
      precinctCount: 5,
      recountThresholdPercent: 0.5
    });
    expect(frames).toHaveLength(5);
    expect(Number.isInteger(frames[0].reportedVotes)).toBe(true);
    expect(Number.isInteger(frames[0].totals[0])).toBe(true);
  });

  it("calculates recount thresholds", () => {
    const result = calculateRecountTrigger([501, 499], 0.5);
    expect(result.triggered).toBe(true);
    expect(result.marginVotes).toBe(2);
  });

  it("calculates deadline urgency", () => {
    const result = calculateDeadline("Wisconsin", "2030-01-02T00:00:00.000Z", new Date("2030-01-01T00:00:00.000Z"));
    expect(result.urgency).toBe("red");
  });

  it("checks ID rules", () => {
    const valid = evaluateIdAnswers({
      hasPhotoId: true,
      hasAddressProof: true,
      nameMatches: true,
      stateIssued: true
    });
    const invalid = evaluateIdAnswers({
      hasPhotoId: false,
      hasAddressProof: false,
      nameMatches: false,
      stateIssued: false
    });

    expect(valid.status).toBe("valid");
    expect(invalid.status).toBe("needs-action");
  });

  it("builds ballot walkthrough stages", () => {
    expect(buildBallotStages()).toHaveLength(4);
  });

  it("handles partial id matches and green deadline states", () => {
    expect(
      evaluateIdAnswers({
        hasPhotoId: true,
        hasAddressProof: false,
        nameMatches: true,
        stateIssued: true
      }).status
    ).toBe("partial");
    expect(
      calculateDeadline("Wisconsin", "2030-01-20T00:00:00.000Z", new Date("2030-01-01T00:00:00.000Z")).urgency
    ).toBe("green");
  });
});
