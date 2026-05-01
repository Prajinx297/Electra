import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OraclePanel } from "../../../../src/components/oracle/OraclePanel";
import { oracleResponseFixture } from "../testUtils";

describe("OraclePanel", () => {
  it("shows loading state", () => {
    render(
      <OraclePanel
        response={oracleResponseFixture}
        language="en"
        cognitiveLevel="citizen"
        busy
        sessionId="session-1"
        stuckInterventionVisible={false}
        onAsk={vi.fn()}
        onCognitiveLevelChange={vi.fn()}
        onDismissStuck={vi.fn()}
      />
    );

    expect(screen.getByText("Explanation style")).toBeInTheDocument();
    expect(screen.queryByText("How do we know this?")).not.toBeInTheDocument();
  });

  it("shows response, warning, trust, and asks questions", async () => {
    const onAsk = vi.fn().mockResolvedValue(undefined);
    render(
      <OraclePanel
        response={{ ...oracleResponseFixture, proactiveWarning: "Check your county deadline." }}
        language="en-simple"
        cognitiveLevel="citizen"
        busy={false}
        sessionId="session-1"
        stuckInterventionVisible={false}
        onAsk={onAsk}
        onCognitiveLevelChange={vi.fn()}
        onDismissStuck={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Oracle message/i)).toBeInTheDocument();
    expect(screen.getByText("Helpful heads-up")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Ask a question"), "Where do I vote?");
    await userEvent.click(screen.getByRole("button", { name: "Ask this question" }));
    expect(onAsk).toHaveBeenCalledWith("Where do I vote?");
  });

  it("simplifies a stuck step and dismisses the intervention", async () => {
    const onAsk = vi.fn().mockResolvedValue(undefined);
    const onDismissStuck = vi.fn();
    render(
      <OraclePanel
        response={oracleResponseFixture}
        language="en"
        cognitiveLevel="citizen"
        busy={false}
        sessionId="session-1"
        stuckInterventionVisible
        onAsk={onAsk}
        onCognitiveLevelChange={vi.fn()}
        onDismissStuck={onDismissStuck}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Simplify this step" }));
    expect(onDismissStuck).toHaveBeenCalled();
    expect(onAsk).toHaveBeenCalledWith(expect.stringContaining("make this simpler"));
  });
});
