import { getPerformance, trace } from 'firebase/performance';

import { app } from './config';

interface TraceLike {
  start: () => void;
  stop: () => void;
  putMetric: (metricName: string, value: number) => void;
}

const noopTrace: TraceLike = {
  start: () => {},
  stop: () => {},
  putMetric: () => {},
};

const createTrace = (name: string): TraceLike => {
  try {
    return trace(getPerformance(app), name) as TraceLike;
  } catch {
    return noopTrace;
  }
};

/**
 * Measures the duration and success state of an Oracle request.
 *
 * @param requestFn - Promise-returning Oracle operation to time
 * @returns The Oracle operation result after recording the trace outcome
 * @throws Re-throws any error from the wrapped Oracle operation
 */
// ts-prune-ignore-next
export async function measureOracleLatency<T>(requestFn: () => Promise<T>): Promise<T> {
  const requestTrace = createTrace('oracle_response_latency');
  requestTrace.start();

  try {
    const result = await requestFn();
    requestTrace.putMetric('success', 1);
    return result;
  } catch (error) {
    requestTrace.putMetric('error', 1);
    throw error;
  } finally {
    requestTrace.stop();
  }
}

/**
 * Creates a trace for time-to-first-token streaming latency measurements.
 *
 * @returns Firebase Performance trace, or a no-op trace when Performance is unavailable
 */
export function measureStreamingLatency() {
  return createTrace('oracle_streaming_ttft');
}

/**
 * Starts a duration trace for a civic journey step.
 *
 * @param stepId - Journey step identifier used to label the trace
 * @returns Function that stops the step duration trace
 */
export function measureJourneyStepTime(stepId: string) {
  const stepTrace = createTrace(`journey_step_${stepId.toLowerCase()}_duration`);
  stepTrace.start();
  return () => stepTrace.stop();
}
