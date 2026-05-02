import type { OracleRequest, OracleResponse } from '@/types';

/**
 * Domain error for failed Oracle API requests.
 */
export class OracleServiceError extends Error {
  public constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'OracleServiceError';
  }
}

/**
 * API client for Electra Oracle endpoints.
 */
export class OracleService {
  private static readonly BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

  private static readonly TIMEOUT_MS = 10_000;

  /**
   * Sends a civic query to the Electra Oracle API endpoint.
   * Automatically aborts after TIMEOUT_MS milliseconds.
   *
   * @param payload - Structured Oracle request with user input,
   *   cognitive level, session ID, and journey history context.
   * @returns Promise resolving to the Oracle's render directive.
   * @throws {OracleServiceError} On non-2xx HTTP responses.
   * @throws {DOMException} When the request times out or is aborted.
   */
  public static async query(payload: OracleRequest): Promise<OracleResponse> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout((): void => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(`${this.BASE_URL}/oracle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new OracleServiceError(response.status, `Oracle API returned ${response.status}`);
      }

      return (await response.json()) as OracleResponse;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}
