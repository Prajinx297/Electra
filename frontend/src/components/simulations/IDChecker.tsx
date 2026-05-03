import { useMemo, useState } from 'react';

import { evaluateIdAnswers } from '../../engines/simulationEngine';
import type { IdAnswers } from '../../types';

// All 12 ECI-approved voter identity documents
// Reference: Election Commission of India circular, 2019
const ECI_APPROVED_DOCUMENTS = [
  'EPIC (Voter ID Card)',
  'Aadhaar Card',
  'MNREGA Job Card',
  'Passbook with photo (Bank / Post Office)',
  'Health Insurance Smart Card (Labour Ministry)',
  'Driving Licence',
  'PAN Card',
  'Indian Passport',
  'Pension Document with photo',
  'NPR Smart Card',
  'Service Identity Cards (Central / State Govt)',
  'Official identity documents by Public Sector Undertakings',
] as const;

const idOptions: [keyof IdAnswers, string][] = [
  ['hasPhotoId', 'I have an EPIC (Voter ID card) or another ECI-approved document'],
  ['hasAddressProof', 'My address in the document matches my constituency'],
  ['nameMatches', 'My name matches the electoral roll'],
  ['stateIssued', 'My document is issued by a government authority'],
];

const IDChecker = () => {
  const [answers, setAnswers] = useState({
    hasPhotoId: false,
    hasAddressProof: false,
    nameMatches: true,
    stateIssued: false,
  });
  const [showDocList, setShowDocList] = useState(false);
  const result = useMemo(() => evaluateIdAnswers(answers), [answers]);

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">
        Check if your documents are valid for voting
      </h2>
      <p className="mt-2 text-sm text-[var(--ink-secondary)]">
        ECI accepts 12 documents. EPIC is primary, but Aadhaar, Passport, PAN, and others are valid alternatives.
      </p>
      <button
        type="button"
        onClick={() => setShowDocList((v) => !v)}
        className="mt-3 text-sm font-semibold text-[var(--civic-green)] underline underline-offset-2"
      >
        {showDocList ? 'Hide document list' : 'See all 12 accepted documents'}
      </button>
      {showDocList ? (
        <ul className="mt-3 grid gap-1 rounded-[16px] bg-[var(--surface-2)] p-4 text-sm text-[var(--ink-secondary)]">
          {ECI_APPROVED_DOCUMENTS.map((doc) => (
            <li key={doc} className="flex items-start gap-2">
              <span className="mt-0.5 text-[var(--civic-green)]">✓</span>
              {doc}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-5 grid gap-3">
        {idOptions.map(([key, label]) => (
          <label
            key={key}
            className="flex min-h-12 items-center gap-3 rounded-[16px] bg-[var(--surface-2)] px-4"
          >
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
          result.status === 'valid'
            ? 'bg-[var(--civic-green-light)]'
            : result.status === 'partial'
              ? 'bg-[var(--civic-amber-light)]'
              : 'bg-[var(--civic-red-light)]'
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
