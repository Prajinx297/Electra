import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import type { FirebaseApp } from "firebase/app";

export function initAppCheck(firebaseApp: FirebaseApp): void {
  if (!import.meta.env.PROD) {
    return;
  }

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    return;
  }

  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true
  });
}
