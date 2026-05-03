import { describe, expect, it, vi } from "vitest";
import { axe } from "jest-axe";
import { render } from "@testing-library/react";
import { AppShell } from "../../src/components/layout/AppShell";
import { OraclePanel } from "../../src/components/oracle/OraclePanel";
import { OnboardingEngine } from "../../src/features/onboarding/OnboardingEngine";
import { TrustPanel } from "../../src/features/trust/TrustPanel";
import BallotWalkthrough from "../../src/components/simulations/BallotWalkthrough";
import JourneyGraph from "../../src/components/shared/JourneyGraph";
import VoteCounter from "../../src/components/simulations/VoteCounter";
import { useElectraStore } from "../../src/engines/stateEngine";
import { oracleResponseFixture } from "./components/testUtils";

describe("accessibility smoke tests", () => {
  it("OnboardingEngine has no a11y violations", async () => {
    const { container } = render(<OnboardingEngine onComplete={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("OraclePanel has no a11y violations", async () => {
    const { container } = render(
      <OraclePanel
        response={oracleResponseFixture}
        language="en"
        cognitiveLevel="citizen"
        busy={false}
        sessionId="session-1"
        stuckInterventionVisible={false}
        onAsk={vi.fn()}
        onCognitiveLevelChange={vi.fn()}
        onDismissStuck={vi.fn()}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("AppShell has no a11y violations", async () => {
    useElectraStore.setState(useElectraStore.getInitialState(), true);
    const { container } = render(
      <AppShell
        userLabel="Guest mode"
        busy={false}
        onAsk={vi.fn().mockResolvedValue(undefined)}
        onPrimaryAction={vi.fn()}
        onSecondaryAction={vi.fn()}
        onLanguageChange={vi.fn()}
        onCognitiveLevelChange={vi.fn()}
        onSignIn={vi.fn().mockResolvedValue(undefined)}
        demoAnnotation={null}
      />
    );
    expect(
      await axe(container, {
        rules: {
          "aria-prohibited-attr": { enabled: false },
          "landmark-unique": { enabled: false }
        }
      })
    ).toHaveNoViolations();
  }, 10000);

  it("TrustPanel has no a11y violations", async () => {
    const { container } = render(<TrustPanel sessionId="session-1" trust={undefined} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("simulation and journey surfaces have no a11y violations", async () => {
    const { container } = render(
      <>
        <BallotWalkthrough />
        <VoteCounter />
        <JourneyGraph />
      </>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
