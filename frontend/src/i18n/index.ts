import type { LanguageCode, TranslationDictionary } from "../types";
import { esLocale } from "./locales/es";
import { frLocale } from "./locales/fr";

const en: TranslationDictionary = {
  appTitle: "ELECTRA",
  guestMode: "Guest mode",
  signedInAs: "Signed in as",
  keepGoing: "Keep going",
  goBack: "Go back",
  tellMeMore: "Tell me more",
  language: "Language",
  simple: "Simple",
  normal: "Normal",
  detailed: "Detailed",
  accessibleOnly: "Accessible places only",
  addToCalendar: "Add to calendar",
  directions: "Directions",
  whatThisMeans: "What this means for you",
  oneStepAtATime: "One step at a time",
  confusionHeatmap: "Confusion heatmap"
};

const es: TranslationDictionary = esLocale;

const enSimple: TranslationDictionary = {
  ...en,
  tellMeMore: "Tell me simply",
  whatThisMeans: "What this means",
  oneStepAtATime: "One small step"
};

const fr: TranslationDictionary = frLocale;

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en,
  es,
  fr,
  "en-simple": enSimple
};

export const getCopy = (language: LanguageCode, key: keyof TranslationDictionary) =>
  translations[language][key];
