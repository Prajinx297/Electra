import { describe, expect, it } from "vitest";
import { getCopy, translations } from "../../src/i18n";

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

  it("resolves every declared locale key without undefined", () => {
    Object.entries(translations).forEach(([language, dictionary]) => {
      Object.keys(dictionary).forEach((key) => {
        expect(getCopy(language as keyof typeof translations, key as keyof typeof dictionary)).toBeDefined();
      });
    });
  });

  it("tone variants produce different strings for simplified copy", () => {
    expect(getCopy("en", "tellMeMore")).not.toBe(getCopy("en-simple", "tellMeMore"));
    expect(getCopy("en", "oneStepAtATime")).not.toBe(getCopy("en-simple", "oneStepAtATime"));
  });
});
