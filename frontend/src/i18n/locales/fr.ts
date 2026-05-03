import type { TranslationDictionary } from '../../types';

/* jscpd:ignore-start */
export const frLocale: TranslationDictionary & {
  onboarding: Record<string, string>;
  oraclePrompts: Record<string, string>;
  civicGuidance: Record<string, string>;
} = {
  appTitle: 'ELECTRA',
  guestMode: 'Mode invite',
  signedInAs: 'Connecte en tant que',
  keepGoing: 'Continuer',
  goBack: 'Retour',
  tellMeMore: 'En dire plus',
  language: 'Langue',
  simple: 'Simple',
  normal: 'Normal',
  detailed: 'Detaille',
  accessibleOnly: 'Lieux accessibles seulement',
  addToCalendar: 'Ajouter au calendrier',
  directions: 'Itineraire',
  whatThisMeans: 'Ce que cela signifie pour vous',
  oneStepAtATime: 'Une etape a la fois',
  confusionHeatmap: 'Carte de confusion',
  onboarding: {
    location: 'Ou votez-vous?',
    familiarity: 'Quel est votre niveau de familiarite avec le vote?',
    accessibility: "De quels soutiens d'accessibilite avez-vous besoin?",
    confident: "Tres a l'aise",
    firstTime: "C'est ma premiere fois",
  },
  oraclePrompts: {
    languageInstruction:
      'Reponds entierement en francais. Utilise la terminologie civique courante aux Etats-Unis.',
    narrator:
      "Tu es le narrateur civique d'ELECTRA. Explique cette etape avec clarte, protections et actions verifiables.",
  },
  civicGuidance: {
    registration: 'Verifiez votre inscription aupres du bureau electoral officiel.',
    ballot: 'Revoyez chaque choix avant de soumettre votre bulletin.',
    audit: 'Les audits comparent les totaux machines avec une verification humaine.',
  },
};
/* jscpd:ignore-end */
