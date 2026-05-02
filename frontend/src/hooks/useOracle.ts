import { useCallback, useRef, useState } from 'react';

import { logger } from '@/lib/logger';
import { AnalyticsService } from '@/services/analytics.service';
import { OracleService, OracleServiceError } from '@/services/oracle.service';
import { JourneyStatus } from '@/types';
import type { OracleRequest, OracleResponse } from '@/types';

interface UseOracleReturn {
  response: OracleResponse | null;
  status: JourneyStatus;
  error: string | null;
  query: (request: OracleRequest) => Promise<void>;
  reset: () => void;
}

export function useOracle(): UseOracleReturn {
  const [response, setResponse] = useState<OracleResponse | null>(null);
  const [status, setStatus] = useState<JourneyStatus>(JourneyStatus.Idle);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const query = useCallback(async (request: OracleRequest): Promise<void> => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStatus(JourneyStatus.Loading);
    setError(null);

    try {
      const result = await OracleService.query(request);
      setResponse(result);
      setStatus(JourneyStatus.Success);
      AnalyticsService.trackJourneyStep(
        result.renderKey ?? result.render ?? 'unknown',
        request.sessionId ?? '',
      );
    } catch (error_: unknown) {
      const message =
        error_ instanceof OracleServiceError
          ? `Oracle error (${error_.statusCode})`
          : 'An unexpected error occurred';
      setError(message);
      setStatus(JourneyStatus.Error);
      logger.error('useOracle query failed', error_);
    }
  }, []);

  const reset = useCallback((): void => {
    setResponse(null);
    setStatus(JourneyStatus.Idle);
    setError(null);
  }, []);

  return { response, status, error, query, reset };
}
