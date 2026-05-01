import { describe, expect, it } from "vitest";
import { getComponent, preloadComponent } from "../../../../src/components/arena/ComponentRegistry";

describe("ComponentRegistry", () => {
  it("returns lazy components and preloads known render keys", async () => {
    expect(getComponent("WelcomeStep")).toBeDefined();
    await expect(preloadComponent("WelcomeStep")).resolves.toHaveProperty("default");
    await expect(preloadComponent(null)).resolves.toBeUndefined();
  });
});
