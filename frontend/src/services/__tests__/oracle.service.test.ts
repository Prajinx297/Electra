import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OracleService, OracleServiceError } from '@/services/oracle.service';
import { CognitiveLevel, RenderKey } from '@/types';
import type { OracleRequest } from '@/types';

const mockRequest: OracleRequest = {
  userInput: 'What is my polling station?',
  userMessage: 'What is my polling station?',
  currentState: 'POLLING_FINDER',
  cognitiveLevel: CognitiveLevel.Simple,
  sessionId: 'session-abc-123',
  journeyHistory: [],
  history: [],
  locale: 'en',
  language: 'en',
};

describe('OracleService', (): void => {
  beforeEach((): void => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
  });

  it('returns parsed OracleResponse on success', async (): Promise<void> => {
    const mockBody = {
      renderKey: RenderKey.Map,
      explanation: 'Your polling station is at...',
      componentProps: {},
      predictedNextKeys: [],
      civicScoreDelta: 3,
      confidence: 0.9,
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: (): Promise<typeof mockBody> => Promise.resolve(mockBody),
    } as Response);

    const result = await OracleService.query(mockRequest);
    expect(result.renderKey).toBe(RenderKey.Map);
  });

  it('throws OracleServiceError on non-ok response', async (): Promise<void> => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(OracleService.query(mockRequest)).rejects.toThrow(OracleServiceError);
  });

  it('throws on network timeout', async (): Promise<void> => {
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((_, reject): void => {
          window.setTimeout((): void => reject(new DOMException('Aborted', 'AbortError')), 50);
        }),
    );
    await expect(OracleService.query(mockRequest)).rejects.toBeDefined();
  });
});
