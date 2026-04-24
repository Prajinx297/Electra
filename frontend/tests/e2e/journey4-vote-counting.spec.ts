import { expect, test } from "@playwright/test";

test("journey 4 shows count simulator", async ({ page }) => {
  await page.route("**/api/oracle", async (route) => {
    await route.fulfill({
      json: {
        parsed: {
          message: "See the count in simple steps.",
          tone: "informative",
          render: "VoteCounter",
          renderProps: {},
          primaryAction: { label: "Keep learning", action: "keep learning" },
          secondaryAction: { label: "Tell me more", action: "what if a precinct reports late" },
          progress: { step: 6, total: 7, label: "Understanding the count" },
          proactiveWarning: null,
          stateTransition: "COUNTING_EXPLAINED",
          cognitiveLevel: "detailed",
          nextAnticipated: "JourneyGraph"
        }
      }
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("Ask a question").fill("How does my vote actually get counted?");
  await page.getByRole("button", { name: "Ask this question" }).click();
  await expect(page.getByText("Watch votes come in")).toBeVisible();
});
