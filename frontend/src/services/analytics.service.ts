import { logEvent } from 'firebase/analytics';

import { analytics } from '@/lib/firebase';
import type { ConfusionEvent, RenderKey } from '@/types';

export class AnalyticsService {
  public static trackConfusion(event: ConfusionEvent): void {
    if (!analytics) {
      return;
    }

    logEvent(analytics, 'confusion_detected', {
      component_key: event.componentKey,
      confusion_type: event.type,
      duration_ms: event.durationMs,
      session_id: event.sessionId,
    });
  }

  public static trackJourneyStep(renderKey: RenderKey | string, sessionId: string): void {
    if (!analytics) {
      return;
    }

    logEvent(analytics, 'journey_step', {
      render_key: renderKey,
      session_id: sessionId,
      timestamp: Date.now(),
    });
  }

  public static trackPredictionHit(renderKey: RenderKey | string, wasCorrect: boolean): void {
    if (!analytics) {
      return;
    }

    logEvent(analytics, 'prediction_result', {
      render_key: renderKey,
      was_correct: wasCorrect,
    });
  }

  public static trackCivicScoreChange(delta: number, newTotal: number): void {
    if (!analytics) {
      return;
    }

    logEvent(analytics, 'civic_score_change', {
      delta,
      new_total: newTotal,
    });
  }

  public static trackError(message: string, detail: string): void {
    if (!analytics) {
      return;
    }

    logEvent(analytics, 'app_error', {
      message,
      detail,
      timestamp: Date.now(),
    });
  }
}
