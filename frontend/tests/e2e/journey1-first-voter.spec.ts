import { expect, test } from "@playwright/test";

test("journey 1 works on desktop and mobile", async ({ page }) => {
  await page.route("**/api/oracle", async (route) => {
    const body = route.request().postDataJSON() as { userMessage: string };
    const message = body.userMessage.toLowerCase();
    const payload =
      message.includes("never voted")
        ? {
            parsed: {
              message: "Choose the help you need.",
              tone: "warm",
              render: "GoalSelect",
              renderProps: {},
              primaryAction: { label: "Continue", action: "continue" },
              secondaryAction: null,
              progress: { step: 1, total: 7, label: "Choosing your goal" },
              proactiveWarning: null,
              stateTransition: "GOAL_SELECT",
              cognitiveLevel: "simple",
              nextAnticipated: "RegistrationChecker"
            }
          }
        : {
            parsed: {
              message: "We will start by checking registration.",
              tone: "warm",
              render: "RegistrationChecker",
              renderProps: {},
              primaryAction: { label: "Check my registration", action: "check my registration" },
              secondaryAction: null,
              progress: { step: 2, total: 7, label: "Checking registration" },
              proactiveWarning: null,
              stateTransition: "REGISTRATION_CHECK",
              cognitiveLevel: "simple",
              nextAnticipated: "DeadlineCalculator"
            }
          };
    await route.fulfill({ json: payload });
  });

  await page.goto("/");
  await page.getByPlaceholder("Ask a question").fill("I've never voted before. Where do I start?");
  await page.getByRole("button", { name: "Ask this question" }).click();
  await expect(page.getByText("Choose the help you need")).toBeVisible();
});
