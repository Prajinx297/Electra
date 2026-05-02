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

export function measureStreamingLatency() {
  return createTrace('oracle_streaming_ttft');
}

export function measureJourneyStepTime(stepId: string) {
  const stepTrace = createTrace(`journey_step_${stepId.toLowerCase()}_duration`);
  stepTrace.start();
  return () => stepTrace.stop();
}
