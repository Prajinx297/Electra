import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';


/**
 * Enables Firebase App Check in production when a reCAPTCHA site key is configured.
 *
 * @param firebaseApp - Initialized Firebase application instance
 */
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
    isTokenAutoRefreshEnabled: true,
  });
}
