interface ConfidenceIndicatorProps {
  confidence: number;
}

export const ConfidenceIndicator = ({ confidence }: ConfidenceIndicatorProps) => {
  const percentage = Math.round(confidence * 100);
  return (
    <div className="rounded-[18px] bg-[var(--accent-light)] p-4 text-sm text-[var(--ink)]">
      <p className="font-semibold">Oracle confidence</p>
      <p className="mt-1">{percentage}% certain about this step.</p>
    </div>
  );
};
