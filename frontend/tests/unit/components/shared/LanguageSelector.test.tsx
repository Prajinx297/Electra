import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSelector } from "../../../../src/components/shared/LanguageSelector";

describe("LanguageSelector", () => {
  it("changes locale through the select control", async () => {
    const onChange = vi.fn();
    render(<LanguageSelector value="en" onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Language"), "fr");
    expect(onChange).toHaveBeenCalledWith("fr");
  });
});
