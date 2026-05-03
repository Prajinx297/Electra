import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

import type { OnboardingProfile } from '../../types';
import { getEntranceMotionProps } from '../../utils/motion';


interface OnboardingEngineProps {
  onComplete: (profile: OnboardingProfile) => void;
}

const accessibilityOptions = ['Mobility', 'Vision', 'Language', 'No specific needs'];

export const OnboardingEngine = ({ onComplete }: OnboardingEngineProps) => {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState('');
  const [familiarity, setFamiliarity] = useState<OnboardingProfile['familiarity']>('first-time');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]);

  const progress = useMemo(() => Math.round(((step + 1) / 3) * 100), [step]);

  const handleLocationChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLocation(event.target.value);
  };

  const handleNeedToggle = (need: string) => {
    setAccessibilityNeeds((current) =>
      current.includes(need)
        ? current.filter((item) => item !== need)
        : [...current.filter((item) => item !== 'No specific needs'), need],
    );
  };

  const handleNext = () => {
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }

    onComplete({
      location: location.trim(),
      familiarity,
      accessibilityNeeds,
      toneMode: familiarity === 'confident' ? 'policy-expert' : 'citizen',
      completedAt: new Date().toISOString(),
    });
  };

  const canContinue = step !== 0 || location.trim().length >= 2;

  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center px-4 py-8">
      <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-[var(--accent)]">Electra intake</p>
          <div
            aria-label={`${progress}% complete`}
            className="grid h-14 w-14 place-items-center rounded-full border-4 border-[var(--civic-green)] text-sm font-bold"
          >
            {progress}%
          </div>
        </div>
        <motion.div
          key={step}
          {...getEntranceMotionProps(reducedMotion)}
          transition={{ duration: reducedMotion ? 0 : 0.3 }}
          className="mt-6"
        >
          {step === 0 ? (
            <label className="block">
              <span className="text-2xl font-bold text-[var(--ink)]">Where are you voting?</span>
              <span className="mt-2 block text-[var(--ink-secondary)]">
                City and district is enough for now.
              </span>
              <input
                value={location}
                onChange={handleLocationChange}
                className="mt-5 min-h-12 w-full rounded-[18px] border border-[var(--border)] px-4"
                placeholder="Mumbai, Maharashtra"
              />
            </label>
          ) : null}
          {step === 1 ? (
            <fieldset>
              <legend className="text-2xl font-bold text-[var(--ink)]">
                How familiar is this?
              </legend>
              <div className="mt-5 grid gap-3">
                {(['first-time', 'some-experience', 'confident'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFamiliarity(option)}
                    className={`min-h-12 rounded-[18px] border px-4 text-left font-semibold ${
                      familiarity === option
                        ? 'border-[var(--civic-green)] bg-[var(--civic-green-light)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)]'
                    }`}
                  >
                    {option.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {step === 2 ? (
            <fieldset>
              <legend className="text-2xl font-bold text-[var(--ink)]">Any access needs?</legend>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {accessibilityOptions.map((need) => (
                  <button
                    key={need}
                    type="button"
                    onClick={() => handleNeedToggle(need)}
                    aria-pressed={accessibilityNeeds.includes(need)}
                    className={`min-h-12 rounded-[18px] border px-4 text-left font-semibold ${
                      accessibilityNeeds.includes(need)
                        ? 'border-[var(--civic-green)] bg-[var(--civic-green-light)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)]'
                    }`}
                  >
                    {need}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
        </motion.div>
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleNext}
          className="mt-6 min-h-12 w-full rounded-full bg-[var(--civic-green)] px-4 font-bold text-white disabled:opacity-50"
        >
          {step === 2 ? 'Enter Electra' : 'Continue'}
        </button>
      </section>
    </main>
  );
};
