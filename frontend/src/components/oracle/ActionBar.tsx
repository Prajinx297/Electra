import { buildPrimaryActionAriaLabel } from "../../utils/accessibilityHelpers";
import type { PrimaryAction } from "../../types";

interface ActionBarProps {
  primaryAction: PrimaryAction;
  secondaryAction: PrimaryAction | null;
  progressLabel: string;
  busy: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
}

export const ActionBar = ({
  primaryAction,
  secondaryAction,
  progressLabel,
  busy,
  onPrimary,
  onSecondary
}: ActionBarProps) => (
  <div className="sticky bottom-0 z-20 border-t border-[var(--border)] bg-[var(--background)]/95 px-4 pb-4 pt-3 backdrop-blur">
    {secondaryAction ? (
      <button
        type="button"
        onClick={onSecondary}
        className="mb-3 min-h-12 text-sm font-semibold text-[var(--accent)] underline underline-offset-4"
      >
        {secondaryAction.label}
      </button>
    ) : null}
    <button
      type="button"
      onClick={onPrimary}
      disabled={busy}
      aria-label={buildPrimaryActionAriaLabel(primaryAction, progressLabel)}
      className="min-h-12 w-full rounded-full bg-[var(--civic-green)] px-5 py-3 text-base font-bold text-white shadow-[0_10px_20px_var(--shadow)] disabled:opacity-60"
    >
      {busy ? "Working on it..." : primaryAction.label}
    </button>
  </div>
);
