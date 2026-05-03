import { describe, expect, it } from "vitest";

import { getEntranceMotionProps } from "../../src/utils/motion";

describe("motion helpers", () => {
  it("omits animation props when reduced motion is enabled", () => {
    expect(getEntranceMotionProps(true)).toEqual({});
  });

  it("returns entrance animation props when motion is allowed", () => {
    expect(getEntranceMotionProps(false)).toEqual({
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 }
    });
    expect(getEntranceMotionProps(null)).toHaveProperty("animate");
  });
});
