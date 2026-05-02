import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOracle } from '@/hooks/useOracle';
import { OracleService } from '@/services/oracle.service';
import { CognitiveLevel, JourneyStatus, RenderKey } from '@/types';
import type { OracleRequest, OracleResponse } from '@/types';

vi.mock('@/services/oracle.service');
vi.mock('@/services/analytics.service');

const mockRequest: OracleRequest = {
  userInput: 'How do I register to vote?',
  userMessage: 'How do I register to vote?',
  currentState: 'WELCOME',
  cognitiveLevel: CognitiveLevel.Simple,
  sessionId: 'test-session-123',
  journeyHistory: [],
  history: [],
  locale: 'en',
  language: 'en',
};

const mockResponse: OracleResponse = {
  renderKey: RenderKey.Form,
  explanation: 'To register, visit your local electoral office.',
  componentProps: {},
  predictedNextKeys: [RenderKey.Map],
  civicScoreDelta: 5,
  confidence: 0.95,
  message: 'To register, visit your local electoral office.',
  tone: 'informative',
  render: RenderKey.Form,
  renderProps: {},
  primaryAction: { label: 'Next', action: 'next' },
  secondaryAction: null,
  progress: { step: 1, total: 1, label: 'Registration' },
  proactiveWarning: null,
  stateTransition: 'REGISTRATION_FLOW',
  cognitiveLevel: CognitiveLevel.Simple,
  nextAnticipated: RenderKey.Map,
};

describe('useOracle', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it('starts in idle state', (): void => {
    const { result } = renderHook((): ReturnType<typeof useOracle> => useOracle());
    expect(result.current.status).toBe(JourneyStatus.Idle);
    expect(result.current.response).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions to loading then success on valid query', async (): Promise<void> => {
    vi.mocked(OracleService.query).mockResolvedValue(mockResponse);
    const { result } = renderHook((): ReturnType<typeof useOracle> => useOracle());

    await act(async (): Promise<void> => {
      await result.current.query(mockRequest);
    });

    expect(result.current.status).toBe(JourneyStatus.Success);
    expect(result.current.response).toEqual(mockResponse);
    expect(result.current.error).toBeNull();
  });

  it('transitions to error state on API failure', async (): Promise<void> => {
    vi.mocked(OracleService.query).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook((): ReturnType<typeof useOracle> => useOracle());

    await act(async (): Promise<void> => {
      await result.current.query(mockRequest);
    });

    expect(result.current.status).toBe(JourneyStatus.Error);
    expect(result.current.error).toBeTruthy();
  });

  it('resets to idle state correctly', async (): Promise<void> => {
    vi.mocked(OracleService.query).mockResolvedValue(mockResponse);
    const { result } = renderHook((): ReturnType<typeof useOracle> => useOracle());

    await act(async (): Promise<void> => {
      await result.current.query(mockRequest);
    });
    act((): void => {
      result.current.reset();
    });

    expect(result.current.status).toBe(JourneyStatus.Idle);
    expect(result.current.response).toBeNull();
  });
});
