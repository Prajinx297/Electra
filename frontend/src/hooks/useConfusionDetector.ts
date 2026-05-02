import { useCallback, useEffect, useRef } from 'react';

import { AnalyticsService } from '@/services/analytics.service';
import type { RenderKey } from '@/types';

const STUCK_THRESHOLD_MS = 30_000;

interface UseConfusionDetectorProps {
  componentKey: RenderKey;
  sessionId: string;
}

interface UseConfusionDetectorReturn {
  onReread: () => void;
  onRetreat: () => void;
}

export function useConfusionDetector({
  componentKey,
  sessionId,
}: UseConfusionDetectorProps): UseConfusionDetectorReturn {
  const mountTimeRef = useRef<number>(Date.now());
  const stuckTimerRef = useRef<number | null>(null);

  useEffect((): (() => void) => {
    mountTimeRef.current = Date.now();

    stuckTimerRef.current = window.setTimeout((): void => {
      AnalyticsService.trackConfusion({
        componentKey,
        type: 'stuck',
        durationMs: STUCK_THRESHOLD_MS,
        sessionId,
      });
    }, STUCK_THRESHOLD_MS);

    return (): void => {
      if (stuckTimerRef.current !== null) {
        window.clearTimeout(stuckTimerRef.current);
      }
    };
  }, [componentKey, sessionId]);

  const onReread = useCallback((): void => {
    AnalyticsService.trackConfusion({
      componentKey,
      type: 'reread',
      durationMs: Date.now() - mountTimeRef.current,
      sessionId,
    });
  }, [componentKey, sessionId]);

  const onRetreat = useCallback((): void => {
    AnalyticsService.trackConfusion({
      componentKey,
      type: 'retreat',
      durationMs: Date.now() - mountTimeRef.current,
      sessionId,
    });
  }, [componentKey, sessionId]);

  return { onReread, onRetreat };
}
