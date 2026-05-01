import { useEffect, useState } from "react";
import { getFeatureFlag, initRemoteConfig } from "../firebase/remoteConfig";

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
