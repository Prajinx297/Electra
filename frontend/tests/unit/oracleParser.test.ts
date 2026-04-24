import { describe, expect, it } from "vitest";
import {
  FALLBACK_ORACLE_RESPONSE,
  VALID_RENDER_KEYS,
  parseOracleResponse
} from "../../src/utils/oracleParser";

describe("oracle parser", () => {
  it("parses valid oracle json", () => {
    const parsed = parseOracleResponse(
      JSON.stringify({
        message: "Choose the help you need.",
        tone: "warm",
        render: "GoalSelect",
        renderProps: {},
        primaryAction: { label: "Continue", action: "continue" },
        secondaryAction: null,
        progress: { step: 1, total: 7, label: "Goal" },
        proactiveWarning: null,
        stateTransition: "GOAL_SELECT",
        cognitiveLevel: "simple",
        nextAnticipated: "RegistrationChecker"
      })
    );

    expect(parsed.render).toBe("GoalSelect");
    expect(parsed.primaryAction.label).toBe("Continue");
  });

  it("falls back on malformed data", () => {
    expect(parseOracleResponse("bad-json")).toEqual(FALLBACK_ORACLE_RESPONSE);
  });

  it("keeps cognitive level when provided", () => {
    const parsed = parseOracleResponse(
      JSON.stringify({
        ...FALLBACK_ORACLE_RESPONSE,
        cognitiveLevel: "detailed"
      })
    );
    expect(parsed.cognitiveLevel).toBe("detailed");
  });

  it("only allows valid render keys", () => {
    const parsed = parseOracleResponse(
      JSON.stringify({
        ...FALLBACK_ORACLE_RESPONSE,
        render: "NotAComponent"
      })
    );
    expect(VALID_RENDER_KEYS).toContain(parsed.render!);
  });
});
