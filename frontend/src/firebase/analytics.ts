import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "./config";

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);
const app = hasFirebaseConfig ? getApps()[0] ?? initializeApp(firebaseConfig) : null;
let analyticsPromise: Promise<ReturnType<typeof getAnalytics> | null> | undefined;

const getAnalyticsInstance = async () => {
  if (!app) {
    return null;
  }
  analyticsPromise ??= isSupported().then((supported) =>
    supported ? getAnalytics(app) : null
  );

  return analyticsPromise;
};

export const trackEvent = async (
  name: string,
  params: Record<string, string | number | boolean | null | undefined>
) => {
  const history = JSON.parse(window.localStorage.getItem("electra-analytics-log") ?? "[]") as Array<Record<string, unknown>>;
  history.push({ name, params, timestamp: new Date().toISOString() });
  window.localStorage.setItem("electra-analytics-log", JSON.stringify(history.slice(-100)));
  const analytics = await getAnalyticsInstance();
  if (analytics) {
    logEvent(analytics, name, params);
  }
};
