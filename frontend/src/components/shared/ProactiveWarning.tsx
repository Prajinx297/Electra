interface ProactiveWarningProps {
  message: string;
}

export const ProactiveWarning = ({ message }: ProactiveWarningProps) => (
  <div
    className="rounded-[20px] border border-[var(--civic-amber)] bg-[var(--civic-amber-light)] p-4 text-sm text-[var(--ink)]"
    role="status"
  >
    <p className="font-semibold">Helpful heads-up</p>
    <p className="mt-1 max-w-prose">{message}</p>
  </div>
);
