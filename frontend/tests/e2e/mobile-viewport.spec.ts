import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });

test("mobile viewport keeps the main action visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  const box = await page.getByRole("button", { name: "Start" }).boundingBox();
  expect(box?.width).toBeGreaterThan(200);
});
