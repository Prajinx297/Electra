import type { LanguageCode, TranslationDictionary } from "../types";
import { esLocale } from "./locales/es";
import { frLocale } from "./locales/fr";

const toDictionary = (locale: TranslationDictionary): TranslationDictionary => ({
  appTitle: locale.appTitle,
  guestMode: locale.guestMode,
  signedInAs: locale.signedInAs,
  keepGoing: locale.keepGoing,
  goBack: locale.goBack,
  tellMeMore: locale.tellMeMore,
  language: locale.language,
  simple: locale.simple,
  normal: locale.normal,
  detailed: locale.detailed,
  accessibleOnly: locale.accessibleOnly,
  addToCalendar: locale.addToCalendar,
  directions: locale.directions,
  whatThisMeans: locale.whatThisMeans,
  oneStepAtATime: locale.oneStepAtATime,
  confusionHeatmap: locale.confusionHeatmap
});

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

const es: TranslationDictionary = toDictionary(esLocale);

const enSimple: TranslationDictionary = {
  ...en,
  tellMeMore: "Tell me simply",
  whatThisMeans: "What this means",
  oneStepAtATime: "One small step"
};

const fr: TranslationDictionary = toDictionary(frLocale);

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en,
  es,
  fr,
  "en-simple": enSimple
};

export const getCopy = (language: LanguageCode, key: keyof TranslationDictionary) =>
  translations[language][key];
