interface ProgressDotsProps {
  step: number;
  total: number;
}

export const ProgressDots = ({ step, total }: ProgressDotsProps) => (
  <div className="flex items-center justify-center gap-2 lg:hidden" aria-label="Journey progress">
    {Array.from({ length: total }, (_, index) => {
      const active = index + 1 <= step;
      return (
        <span
          key={index}
          className={`h-3 w-3 rounded-full ${
            active ? "bg-[var(--civic-green)]" : "bg-[var(--border)]"
          }`}
        />
      );
    })}
  </div>
);
