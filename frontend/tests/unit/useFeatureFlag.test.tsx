import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const remoteConfigMocks = vi.hoisted(() => ({
  getFeatureFlag: vi.fn(),
  initRemoteConfig: vi.fn()
}));

vi.mock("../../src/firebase/remoteConfig", () => remoteConfigMocks);

import { useFeatureFlag } from "../../src/hooks/useFeatureFlag";

describe("useFeatureFlag", () => {
  beforeEach(() => {
    remoteConfigMocks.getFeatureFlag.mockReset();
    remoteConfigMocks.initRemoteConfig.mockReset();
  });

  it("refreshes the flag after remote config initializes", async () => {
    remoteConfigMocks.getFeatureFlag.mockReturnValueOnce(false).mockReturnValue(true);
    remoteConfigMocks.initRemoteConfig.mockResolvedValue(undefined);

    const { result } = renderHook(() => useFeatureFlag("journey_graph"));

    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("skips updates after unmount", async () => {
    let resolveConfig: () => void = () => undefined;
    remoteConfigMocks.getFeatureFlag.mockReturnValue(false);
    remoteConfigMocks.initRemoteConfig.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveConfig = resolve;
      })
    );

    const { unmount } = renderHook(() => useFeatureFlag("journey_graph"));
    unmount();

    await act(async () => {
      resolveConfig();
    });

    expect(remoteConfigMocks.getFeatureFlag).toHaveBeenCalledTimes(1);
  });
});
