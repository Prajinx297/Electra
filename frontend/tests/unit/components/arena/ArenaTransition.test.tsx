import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArenaTransition } from "../../../../src/components/arena/ArenaTransition";

describe("ArenaTransition", () => {
  it("renders children inside the transition wrapper", () => {
    render(
      <ArenaTransition transitionKey="welcome">
        <button type="button">Focusable child</button>
      </ArenaTransition>
    );

    expect(screen.getByRole("button", { name: "Focusable child" })).toBeInTheDocument();
  });
});
