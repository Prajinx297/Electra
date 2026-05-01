import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GoalSelect from "../../../../src/components/shared/GoalSelect";
import { useElectraStore } from "../../../../src/engines/stateEngine";

describe("GoalSelect", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
  });

  it("updates draft selection when a goal is selected", async () => {
    render(<GoalSelect />);

    await userEvent.click(screen.getByRole("button", { name: "I need accessibility help" }));
    expect(useElectraStore.getState().draftSelection).toBe("I need accessibility help");
  });
});
