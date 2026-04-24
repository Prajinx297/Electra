import { expect, test } from "@playwright/test";

test("journey 3 shows id checker", async ({ page }) => {
  await page.route("**/api/oracle", async (route) => {
    await route.fulfill({
      json: {
        parsed: {
          message: "Let’s check what ID you have right now.",
          tone: "warning",
          render: "IDChecker",
          renderProps: {},
          primaryAction: { label: "Check my ID", action: "check my id" },
          secondaryAction: { label: "Tell me more", action: "backup vote option" },
          progress: { step: 4, total: 7, label: "Checking your ID" },
          proactiveWarning: "If polls are closing soon, ask what you can still do before you leave.",
          stateTransition: "ID_ISSUE",
          cognitiveLevel: "simple",
          nextAnticipated: "PollingFinder"
        }
      }
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("Ask a question").fill("It is election day. They say my ID is not valid.");
  await page.getByRole("button", { name: "Ask this question" }).click();
  await expect(page.getByText("Check whether your ID may work")).toBeVisible();
});
