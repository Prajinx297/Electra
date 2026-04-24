import type { IdAnswers, LanguageCode, ValidationResult } from "../types";

const blockedPattern = /(ignore previous|system prompt|<script|<\/script|javascript:)/i;

export const sanitizeOracleInput = (value: string) =>
  value
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(blockedPattern, "")
    .trim()
    .slice(0, 500);

export const sanitizeAddressInput = (value: string) =>
  sanitizeOracleInput(value).replace(/[^a-zA-Z0-9\s,.\-#/]/g, "");

export const validateName = (value: string): ValidationResult<string> => {
  const sanitized = sanitizeOracleInput(value);
  const errors: Record<string, string> = {};
  if (sanitized.length < 2) {
    errors.name = "Please enter your name.";
  }
  return {
    valid: Object.keys(errors).length === 0,
    data: Object.keys(errors).length === 0 ? sanitized : undefined,
    errors
  };
};

export const validateAddress = (value: string): ValidationResult<string> => {
  const sanitized = sanitizeAddressInput(value);
  const errors: Record<string, string> = {};
  if (sanitized.length < 8) {
    errors.address = "Please enter a full address.";
  }
  return {
    valid: Object.keys(errors).length === 0,
    data: Object.keys(errors).length === 0 ? sanitized : undefined,
    errors
  };
};

export const validateLanguagePreference = (
  value: string
): ValidationResult<LanguageCode> => {
  const errors: Record<string, string> = {};
  if (!["en", "es", "fr", "en-simple"].includes(value)) {
    errors.language = "Choose a supported language.";
  }
  return {
    valid: Object.keys(errors).length === 0,
    data: Object.keys(errors).length === 0 ? (value as LanguageCode) : undefined,
    errors
  };
};

export const storeLanguagePreference = (language: LanguageCode) => {
  window.localStorage.setItem("electra-language", language);
};

export const readLanguagePreference = (): LanguageCode =>
  (window.localStorage.getItem("electra-language") as LanguageCode | null) ?? "en";

export const validateIdAnswers = (answers: IdAnswers): ValidationResult<IdAnswers> => {
  const errors: Record<string, string> = {};
  if (!answers.hasPhotoId && !answers.hasAddressProof) {
    errors.id = "Bring a photo ID or address paper.";
  }
  return {
    valid: Object.keys(errors).length === 0,
    data: Object.keys(errors).length === 0 ? answers : undefined,
    errors
  };
};
