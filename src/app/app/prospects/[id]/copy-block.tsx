"use client";

import { useState } from "react";

export function CopyBlock({ label, text, multiline }: { label: string; text: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="field">
      <div className="row between">
        <span className="label-text">{label}</span>
        <button
          type="button"
          className="btn sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
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
      {multiline ? <pre className="copy-text">{text || "—"}</pre> : <p className="copy-text">{text || "—"}</p>}
    </div>
  );
}
