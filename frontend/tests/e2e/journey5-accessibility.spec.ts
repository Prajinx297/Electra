import { expect, test } from "@playwright/test";

test("journey 5 shows accessibility help", async ({ page }) => {
  await page.route("**/api/oracle", async (route) => {
    await route.fulfill({
      json: {
        parsed: {
          message: "We can build a plan around your needs.",
          tone: "warm",
          render: "AccessibilitySupport",
          renderProps: {},
          primaryAction: { label: "Show support options", action: "show support options" },
          secondaryAction: { label: "Tell me more", action: "show accessible voting places" },
          progress: { step: 3, total: 7, label: "Finding the right support" },
          proactiveWarning: null,
          stateTransition: "ACCESSIBILITY_NEEDS_PATH",
          cognitiveLevel: "simple",
          nextAnticipated: "PollingFinder"
        }
      }
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("Ask a question").fill("I need to vote but I use a walker and need accessible places.");
  await page.getByRole("button", { name: "Ask this question" }).click();
  await expect(page.getByText("Choose the support you need")).toBeVisible();
});
