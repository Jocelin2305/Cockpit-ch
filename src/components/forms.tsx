"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pending, className = "btn primary" }: { children: React.ReactNode; pending?: string; className?: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={isPending}>
      {isPending ? pending ?? "Un instant…" : children}
    </button>
  );
}

export function FormMessage({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p className="alert error" role="alert">{error}</p>;
  if (ok) return <p className="alert ok" role="status">{ok}</p>;
  return null;
}

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="field">
      <span className="label-text">{label}</span>
      <div className="copy-row">
        <input className="input mono" readOnly value={value} onFocus={(e) => e.currentTarget.select()} aria-label={label} />
        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}

// Bouton en deux temps pour les actions destructives : un premier clic arme, le second confirme.
export function ConfirmButton({ children, confirm }: { children: React.ReactNode; confirm: string }) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  return (
    <button
      type={armed ? "submit" : "button"}
      className={`btn sm danger${armed ? " armed" : ""}`}
      disabled={pending}
      onClick={() => !armed && setArmed(true)}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirm : children}
    </button>
  );
}
