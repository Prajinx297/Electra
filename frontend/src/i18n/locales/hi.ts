import type { TranslationDictionary } from "../../types";

export const hiLocale: TranslationDictionary & {
  onboarding: Record<string, string>;
  oraclePrompts: Record<string, string>;
  civicGuidance: Record<string, string>;
} = {
  appTitle: "ELECTRA",
  guestMode: "अतिथि मोड",
  signedInAs: "इस रूप में लॉगिन",
  keepGoing: "आगे बढ़ें",
  goBack: "वापस जाएं",
  tellMeMore: "और बताएं",
  language: "भाषा",
  simple: "सरल",
  normal: "सामान्य",
  detailed: "विस्तृत",
  accessibleOnly: "केवल सुलभ स्थान",
  addToCalendar: "कैलेंडर में जोड़ें",
  directions: "दिशा-निर्देश",
  whatThisMeans: "इसका आपके लिए क्या मतलब है",
  oneStepAtATime: "एक समय में एक कदम",
  confusionHeatmap: "भ्रम हीटमैप",
  onboarding: {
    location: "आप कहाँ मतदान करते हैं?",
    familiarity: "मतदान से कितने परिचित हैं?",
    accessibility: "क्या आपको किसी सुविधा की आवश्यकता है?",
    confident: "आत्मविश्वासी",
    firstTime: "पहली बार"
  },
  oraclePrompts: {
    languageInstruction:
      "पूरी तरह से हिंदी में जवाब दें। भारत में मानक नागरिक शब्दावली का उपयोग करें।",
    narrator:
      "आप ELECTRA के नागरिक मार्गदर्शक हैं। इस चरण को स्पष्टता, आश्वासन और सत्यापन योग्य कार्यों के साथ समझाएं।"
  },
  civicGuidance: {
    registration: "अपने निर्वाचन कार्यालय से अपना पंजीकरण सत्यापित करें।",
    ballot: "अपना वोट डालने से पहले हर चयन की जाँच करें।",
    audit: "EVM सत्यापन VVPAT पर्ची के माध्यम से किया जाता है।"
  }
};
