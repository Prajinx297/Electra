import { logEvent } from 'firebase/analytics';

import { analytics } from '@/lib/firebase';
import type { ConfusionEvent, RenderKey } from '@/types';

export class AnalyticsService {
  /**
   * Tracks a confusion signal emitted during user interaction.
   *
   * @param event - Structured confusion event payload.
   * @returns No return value.
   * @throws {Error} Never thrown directly; no-op when analytics is unavailable.
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
   * Tracks Oracle-selected render key for journey step telemetry.
   *
   * @param renderKey - Render key shown to the user for this step.
   * @param sessionId - Session identifier used for aggregation.
   * @returns No return value.
   * @throws {Error} Never thrown directly; no-op when analytics is unavailable.
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
   * Tracks whether the predicted next render matched actual output.
   *
   * @param renderKey - Render key that was predicted/observed.
   * @param wasCorrect - Whether the prediction was correct.
   * @returns No return value.
   * @throws {Error} Never thrown directly; no-op when analytics is unavailable.
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
   * Tracks civic score delta emitted by Oracle progression.
   *
   * @param delta - Score increment awarded this step.
   * @param newTotal - Updated cumulative score.
   * @returns No return value.
   * @throws {Error} Never thrown directly; no-op when analytics is unavailable.
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
   * Tracks application-level errors for observability.
   *
   * @param message - High-level error summary.
   * @param detail - Low-level error details.
   * @returns No return value.
   * @throws {Error} Never thrown directly; no-op when analytics is unavailable.
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
