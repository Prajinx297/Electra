import { useEffect, useState } from 'react';

import { getFeatureFlag, initRemoteConfig } from '../firebase/remoteConfig';

/**
 * Subscribes a component to a Remote Config-backed feature flag.
 *
 * Returns the local default immediately, then refreshes once Remote Config has
 * fetched and activated the latest values.
 *
 * @param key - Feature flag key to read
 * @returns Current boolean value for the feature flag
 */
export function useFeatureFlag(key: string): boolean {
  const [value, setValue] = useState(() => getFeatureFlag(key));

  useEffect(() => {
    let active = true;
    void initRemoteConfig().then(() => {
      if (active) {
        setValue(getFeatureFlag(key));
      }
    });

    return () => {
      active = false;
    };
  }, [key]);

  return value;
}
