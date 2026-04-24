import { describe, expect, it } from "vitest";
import {
  buildOracleAriaLabel,
  buildPrimaryActionAriaLabel,
  buildStateChangeAnnouncement,
  calculateContrastRatio,
  focusFirstInteractive
} from "../../src/utils/accessibilityHelpers";

describe("accessibility helpers", () => {
  it("creates ARIA labels", () => {
    expect(buildOracleAriaLabel("Hello", "warm")).toContain("Oracle message");
    expect(
      buildPrimaryActionAriaLabel({ label: "Continue", action: "continue" }, "Goal")
    ).toContain("Continue");
    expect(buildStateChangeAnnouncement("ID_CHECK", "Check your ID").toLowerCase()).toContain("check your id");
  });

  it("manages focus", () => {
    const wrapper = document.createElement("div");
    const button = document.createElement("button");
    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
    focusFirstInteractive(wrapper);
    expect(document.activeElement).toBe(button);
    wrapper.remove();
  });

  it("calculates contrast ratios", () => {
    const contrast = calculateContrastRatio("#1A1A2E", "#FAFAF8");
    expect(contrast.ratio).toBeGreaterThan(7);
    expect(contrast.passesAAA).toBe(true);
    expect(calculateContrastRatio("#888888", "#999999").passesAA).toBe(false);
  });
});
