import { describe, expect, it, vi } from "vitest";
import {
  OracleResponseSchema,
  SourceSchema,
  TrustSchema,
  validateOracleResponse
} from "../../src/lib/zodSchemas";

const validOracleResponse = {
  message: "Vote at your polling place.",
  tone: "citizen",
  render: "DecisionCard",
  renderProps: { title: "Next step" },
  primaryAction: { label: "Continue", action: "continue" },
  secondaryAction: { label: "Simplify", action: "simplify" },
  progress: 50,
  proactiveWarning: "Check local deadlines.",
  stateTransition: "POLLING_FINDER",
  cognitiveLevel: "standard",
  nextAnticipated: ["PollingFinder"],
  confidence: 93,
  trust: {
    sources: [
      {
        title: "Voting and elections",
        publisher: "ECI",
        url: "https://www.eci.gov.in",
        lastVerified: "2026-04-30T00:00:00.000Z"
      }
    ],
    confidence: 91,
    rationale: "Official source."
  }
};

describe("zodSchemas", () => {
  it("validates source, trust, and oracle response contracts", () => {
    expect(SourceSchema.safeParse(validOracleResponse.trust.sources[0]).success).toBe(true);
    expect(TrustSchema.safeParse(validOracleResponse.trust).success).toBe(true);
    expect(OracleResponseSchema.safeParse(validOracleResponse).success).toBe(true);
    expect(validateOracleResponse(validOracleResponse).message).toBe("Vote at your polling place.");
  });

  it("rejects malformed AI output before it reaches the UI", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      validateOracleResponse({
        ...validOracleResponse,
        trust: { ...validOracleResponse.trust, confidence: 101 }
      })
    ).toThrow("Oracle response schema mismatch");
    expect(errorSpy).toHaveBeenCalled();
  });
});
