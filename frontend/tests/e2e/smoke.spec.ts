import { expect, test } from "@playwright/test";

test("loads app, completes onboarding, asks Oracle, and sees response", async ({ page }) => {
  await page.route("**/api/oracle", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Your next step is to check your registration.",
        tone: "informative",
        render: "RegistrationChecker",
        renderProps: {},
        primaryAction: { label: "Continue", action: "continue" },
        secondaryAction: null,
        progress: { step: 2, total: 7, label: "Registration" },
        proactiveWarning: null,
        stateTransition: "REGISTRATION_CHECK",
        cognitiveLevel: "citizen",
        nextAnticipated: "DeadlineCalculator",
        trust: {
          sources: [],
          confidence: 0.9,
          lastVerified: "2026-04-30",
          rationale: "Smoke test response."
        }
      })
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("Atlanta, GA").fill("Atlanta, GA");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "confident" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "No specific needs" }).click();
  await page.getByRole("button", { name: "Enter Electra" }).click();

  await page.getByPlaceholder("Ask a question").fill("How do I vote?");
  await page.getByRole("button", { name: "Ask this question" }).click();

  await expect(page.getByText("Your next step is to check your registration.")).toBeVisible();
});
