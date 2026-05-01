import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ArenaPanel } from "../../../../src/components/arena/ArenaPanel";
import { useElectraStore } from "../../../../src/engines/stateEngine";

describe("ArenaPanel", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
  });

  it("renders the component named by the oracle", async () => {
    render(<ArenaPanel render="WelcomeStep" renderProps={{ title: "Welcome test" }} />);

    await waitFor(() => expect(screen.getByText("Welcome test")).toBeInTheDocument());
  });
});
