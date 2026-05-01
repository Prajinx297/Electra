import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppShell } from "../../src/components/layout/AppShell";
import { useElectraStore } from "../../src/engines/stateEngine";

describe("oracle rendering pipeline", () => {
  beforeEach(() => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    useElectraStore.setState({
      currentRender: "IDChecker",
      currentRenderProps: {},
      currentResponse: {
        message: "Check your ID now.",
        tone: "warm",
        render: "IDChecker",
        renderProps: {},
        primaryAction: { label: "Check my ID", action: "check my id" },
        secondaryAction: null,
        progress: { step: 4, total: 7, label: "Checking your ID" },
        proactiveWarning: null,
        stateTransition: "ID_ISSUE",
        cognitiveLevel: "simple",
        nextAnticipated: "PollingFinder"
      }
    });
  });

  it("mounts the component named by the oracle", async () => {
    render(
      <AppShell
        userLabel="Guest"
        busy={false}
        onAsk={async () => undefined}
        onPrimaryAction={() => undefined}
        onSecondaryAction={() => undefined}
        onLanguageChange={() => undefined}
        onCognitiveLevelChange={() => undefined}
        onSignIn={async () => undefined}
        demoAnnotation={null}
      />
    );

    await waitFor(
      () => expect(screen.getByText(/Check whether your ID may work/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });
});
