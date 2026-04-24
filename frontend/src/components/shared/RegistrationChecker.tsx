import { useState } from "react";
import { validateAddress, validateName } from "../../utils/validators";

const RegistrationChecker = () => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("We only need your name and home address to check.");

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_8px_24px_var(--shadow)]">
      <h2 className="text-[1.6rem] font-bold text-[var(--ink)]">Check your registration</h2>
      <p className="mt-2 max-w-prose text-[var(--ink-secondary)]">{message}</p>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Your name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-12 w-full rounded-[16px] border border-[var(--border)] px-4"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Home address</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="min-h-12 w-full rounded-[16px] border border-[var(--border)] px-4"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const nameResult = validateName(name);
            const addressResult = validateAddress(address);
            setMessage(
              nameResult.valid && addressResult.valid
                ? "Those details look ready to check."
                : "Please fill both boxes with full details."
            );
          }}
          className="min-h-12 rounded-full bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)]"
        >
          Check these details
        </button>
      </div>
    </section>
  );
};

export default RegistrationChecker;
