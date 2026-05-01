import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegistrationChecker from "../../../../src/components/shared/RegistrationChecker";

describe("RegistrationChecker", () => {
  it("validates registration details", async () => {
    render(<RegistrationChecker />);

    await userEvent.type(screen.getByLabelText("Your name"), "Sarah Voter");
    await userEvent.type(screen.getByLabelText("Home address"), "123 Main Street");
    await userEvent.click(screen.getByRole("button", { name: "Check these details" }));

    expect(screen.getByText("Those details look ready to check.")).toBeInTheDocument();
  });
});
