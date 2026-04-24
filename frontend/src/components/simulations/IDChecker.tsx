import { useMemo, useState } from "react";
import { evaluateIdAnswers } from "../../engines/simulationEngine";

const IDChecker = () => {
  const [answers, setAnswers] = useState({
    hasPhotoId: false,
    hasAddressProof: false,
    nameMatches: true,
    stateIssued: false
  });
  const result = useMemo(() => evaluateIdAnswers(answers), [answers]);

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">Check whether your ID may work</h2>
      <div className="mt-5 grid gap-3">
        {[
          ["hasPhotoId", "I have a photo ID"],
          ["hasAddressProof", "I have one paper with my address"],
          ["nameMatches", "My name matches my records"],
          ["stateIssued", "My ID is state-issued"]
        ].map(([key, label]) => (
          <label key={key} className="flex min-h-12 items-center gap-3 rounded-[16px] bg-[var(--surface-2)] px-4">
            <input
              type="checkbox"
              checked={answers[key as keyof typeof answers]}
              onChange={(event) =>
                setAnswers((current) => ({ ...current, [key]: event.target.checked }))
              }
            />
            <span className="text-[var(--ink)]">{label}</span>
          </label>
        ))}
      </div>
      <div
        className={`mt-5 rounded-[18px] p-4 ${
          result.status === "valid"
            ? "bg-[var(--civic-green-light)]"
            : result.status === "partial"
              ? "bg-[var(--civic-amber-light)]"
              : "bg-[var(--civic-red-light)]"
        }`}
      >
        <p className="font-bold text-[var(--ink)]">{result.message}</p>
        <ul className="mt-3 space-y-2 text-[var(--ink-secondary)]">
          {result.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default IDChecker;
