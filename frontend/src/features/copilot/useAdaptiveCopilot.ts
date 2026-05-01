import { useEffect } from "react";
import { useElectraStore } from "../../engines/stateEngine";
import { civicBus } from "../../events/civicEventBus";

const STUCK_THRESHOLD_MS = 30000;

export const useAdaptiveCopilot = () => {
  const currentState = useElectraStore((state) => state.currentState);
  const showStuckIntervention = useElectraStore((state) => state.showStuckIntervention);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      showStuckIntervention();
      civicBus.emit({
        type: "CONFUSION_DETECTED",
        payload: { stepId: currentState, level: 1 }
      });
    }, STUCK_THRESHOLD_MS);
    return () => window.clearTimeout(timer);
  }, [currentState, showStuckIntervention]);
};
