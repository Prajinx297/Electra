import {
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  type RemoteConfig,
} from 'firebase/remote-config';

import { app } from './config';

const defaults: Record<string, boolean | number | string> = {
  election_simulator_enabled: true,
  civic_score_enabled: true,
  streaming_oracle_enabled: true,
  journey_visualizer_enabled: true,
  simulator_anomaly_injection: false,
  max_oracle_questions_per_session: 20,
};

let remoteConfig: RemoteConfig | null = null;

const getConfig = () => {
  if (remoteConfig) {
    return remoteConfig;
  }

  try {
    remoteConfig = getRemoteConfig(app);
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000;
    remoteConfig.defaultConfig = defaults;
    return remoteConfig;
  } catch {
    return null;
  }
};

export async function initRemoteConfig(): Promise<void> {
  const config = getConfig();
  if (!config) {
    return;
  }

  try {
    await fetchAndActivate(config);
  } catch {
    // Remote Config is best-effort. Defaults keep flagship features available locally.
  }
}

export function getFeatureFlag(key: string): boolean {
  const fallback = Boolean(defaults[key]);
  const config = getConfig();
  return config ? getValue(config, key).asBoolean() : fallback;
}

export function getConfigValue(key: string): string {
  const fallback = defaults[key];
  const config = getConfig();
  return config ? getValue(config, key).asString() : String(fallback ?? '');
}

export function getConfigNumber(key: string): number {
  const fallback = defaults[key];
  const config = getConfig();
  return config ? getValue(config, key).asNumber() : Number(fallback ?? 0);
}
