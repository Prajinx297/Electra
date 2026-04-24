import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import enSimple from "./en-simple.json";
import type { LanguageCode, TranslationDictionary } from "../types";

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en,
  es,
  fr,
  "en-simple": enSimple
};

export const getCopy = (
  language: LanguageCode,
  key: keyof TranslationDictionary
): string => translations[language][key];
