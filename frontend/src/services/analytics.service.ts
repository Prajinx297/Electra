import { logEvent } from 'firebase/analytics';

import { analytics } from '@/lib/firebase';
import type { ConfusionEvent, RenderKey } from '@/types';

/**
 * Sends product analytics events for civic journey behavior and application health.
 */
export class AnalyticsService {
  /**
   * Records a confusion signal for the active rendered component.
   *
   * @param event - Confusion event details including component, type, duration, and session
   */
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

  /**
   * Records that the user reached or viewed a civic journey render step.
   *
   * @param renderKey - Render key associated with the step
   * @param sessionId - Current journey session identifier
   */
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

  /**
   * Records whether an Oracle prediction matched the user's actual next step.
   *
   * @param renderKey - Predicted render key being evaluated
   * @param wasCorrect - Whether the prediction matched the next rendered component
   */
  public static trackPredictionHit(renderKey: RenderKey | string, wasCorrect: boolean): void {
    if (!analytics) {
      return;
    }

    logEvent(analytics, 'prediction_result', {
      render_key: renderKey,
      was_correct: wasCorrect,
    });
  }

  /**
   * Records a civic score update for longitudinal engagement tracking.
   *
   * @param delta - Score change applied by the event
   * @param newTotal - User's updated civic score after applying the delta
   */
  public static trackCivicScoreChange(delta: number, newTotal: number): void {
    if (!analytics) {
      return;
    }

    logEvent(analytics, 'civic_score_change', {
      delta,
      new_total: newTotal,
    });
  }

  /**
   * Records a handled application error for operational monitoring.
   *
   * @param message - Human-readable error summary
   * @param detail - Additional diagnostic detail for the error
   */
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
