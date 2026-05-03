import type { TranslationDictionary } from '../../types';

/* jscpd:ignore-start */
export const esLocale: TranslationDictionary & {
  onboarding: Record<string, string>;
  oraclePrompts: Record<string, string>;
  civicGuidance: Record<string, string>;
} = {
  appTitle: 'ELECTRA',
  guestMode: 'Modo invitado',
  signedInAs: 'Sesion iniciada como',
  keepGoing: 'Continuar',
  goBack: 'Volver',
  tellMeMore: 'Explicame mas',
  language: 'Idioma',
  simple: 'Simple',
  normal: 'Normal',
  detailed: 'Detallado',
  accessibleOnly: 'Solo lugares accesibles',
  addToCalendar: 'Agregar al calendario',
  directions: 'Indicaciones',
  whatThisMeans: 'Que significa para ti',
  oneStepAtATime: 'Un paso a la vez',
  confusionHeatmap: 'Mapa de confusion',
  onboarding: {
    location: 'Donde votas?',
    familiarity: 'Que tan familiar te sientes con votar?',
    accessibility: 'Que apoyos de accesibilidad necesitas?',
    confident: 'Con confianza',
    firstTime: 'Es mi primera vez',
  },
  oraclePrompts: {
    languageInstruction:
      'Responde completamente en espanol. Usa terminologia civica comun en India.',
    narrator:
      'Eres el narrador civico de ELECTRA. Explica este paso con claridad, garantias y acciones verificables.',
  },
  civicGuidance: {
    registration: 'Verifica tu registro con la oficina electoral oficial.',
    ballot: 'Revisa cada seleccion antes de enviar tu boleta.',
    audit: 'Las auditorias comparan registros de maquina con revision humana.',
  },
};
/* jscpd:ignore-end */
