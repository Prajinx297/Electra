import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../../../../src/components/layout/Header";

describe("Header", () => {
  it("renders user state and supports sign-in and language changes", async () => {
    const onLanguageChange = vi.fn();
    const onSignIn = vi.fn().mockResolvedValue(undefined);

    render(
      <Header
        language="en"
        userLabel="Guest mode"
        onLanguageChange={onLanguageChange}
        onSignIn={onSignIn}
      />
    );

    expect(screen.getByText("ELECTRA")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Language"), "es");
    await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

    expect(onLanguageChange).toHaveBeenCalledWith("es");
    expect(onSignIn).toHaveBeenCalled();
  });
});
