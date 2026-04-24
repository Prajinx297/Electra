import { expect, test } from "@playwright/test";

test("keyboard navigation works through the first screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Skip to main content")).toBeVisible();

  const askBox = page.getByPlaceholder("Ask a question");
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    const focused = await askBox.evaluate((element) => element === document.activeElement);
    if (focused) {
      break;
    }
  }

  await expect(askBox).toBeFocused();
});
