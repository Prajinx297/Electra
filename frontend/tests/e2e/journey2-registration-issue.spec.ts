import { expect, test } from "@playwright/test";

test("journey 2 shows registration issue help", async ({ page }) => {
  await page.route("**/api/oracle", async (route) => {
    await route.fulfill({
      json: {
        parsed: {
          message: "If your registration is missing, you still have options.",
          tone: "warm",
          render: "RegistrationChecker",
          renderProps: {},
          primaryAction: { label: "Check my details", action: "check my details" },
          secondaryAction: { label: "Tell me more", action: "explain my backup vote option" },
          progress: { step: 2, total: 7, label: "Checking your registration" },
          proactiveWarning: "If the deadline is close, act today.",
          stateTransition: "REGISTRATION_ISSUE",
          cognitiveLevel: "simple",
          nextAnticipated: "StatusSummary"
        }
      }
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("Ask a question").fill("I tried to register but I think something went wrong.");
  await page.getByRole("button", { name: "Ask this question" }).click();
  await expect(page.getByText("Check your registration")).toBeVisible();
});
