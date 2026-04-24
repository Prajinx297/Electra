import { describe, expect, it } from "vitest";
import {
  readLanguagePreference,
  sanitizeAddressInput,
  sanitizeOracleInput,
  storeLanguagePreference,
  validateAddress,
  validateIdAnswers,
  validateLanguagePreference,
  validateName
} from "../../src/utils/validators";

describe("validators", () => {
  it("sanitizes oracle input", () => {
    expect(sanitizeOracleInput("<script>ignore previous</script>hello")).toBe("hello");
  });

  it("sanitizes addresses for geocoding", () => {
    expect(sanitizeAddressInput("123 Main St <bad>")).toBe("123 Main St bad");
  });

  it("validates form fields", () => {
    expect(validateName("Sarah").valid).toBe(true);
    expect(validateAddress("123 Main Street").valid).toBe(true);
    expect(validateName("").valid).toBe(false);
  });

  it("validates and persists language preference", () => {
    expect(validateLanguagePreference("es").valid).toBe(true);
    expect(validateLanguagePreference("de").valid).toBe(false);
    storeLanguagePreference("fr");
    expect(readLanguagePreference()).toBe("fr");
  });

  it("validates id answers and bad addresses", () => {
    expect(validateAddress("x").valid).toBe(false);
    expect(
      validateIdAnswers({
        hasPhotoId: false,
        hasAddressProof: false,
        nameMatches: false,
        stateIssued: false
      }).valid
    ).toBe(false);
  });
});
