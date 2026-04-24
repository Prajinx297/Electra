import { describe, expect, it } from "vitest";
import { translations } from "../../src/i18n";

describe("i18n", () => {
  it("has the same keys in every language file", () => {
    const baseKeys = Object.keys(translations.en);
    Object.values(translations).forEach((dictionary) => {
      expect(Object.keys(dictionary)).toEqual(baseKeys);
    });
  });

  it("contains no blank translations", () => {
    Object.values(translations).forEach((dictionary) => {
      Object.values(dictionary).forEach((value) => {
        expect(value.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
