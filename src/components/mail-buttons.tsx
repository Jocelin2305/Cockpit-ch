"use client";

import { useState, useTransition } from "react";
import { sendDueEmails, sendNextEmail } from "@/app/app/mail-actions";

type Res = { ok?: string; error?: string };

function useSend(run: () => Promise<Res>) {
  const [res, setRes] = useState<Res>({});
  const [pending, start] = useTransition();
  return { res, pending, go: () => start(async () => setRes(await run())) };
}

export function SendEmailButton({ prospectId, label }: { prospectId: string; label: string }) {
  const s = useSend(() => sendNextEmail(prospectId));
  return (
    <span className="ai-action">
      <button type="button" className="btn primary" disabled={s.pending} onClick={s.go} data-tip="Envoie cet email depuis votre boîte connectée ; la relance suivante se programme seule.">
        {s.pending ? "Envoi…" : label}
      </button>
      {s.res.error && <span className="ai-msg error">{s.res.error}</span>}
      {s.res.ok && <span className="ai-msg">{s.res.ok}</span>}
    </span>
  );
}

export function SendDueButton({ includeFirst, label, primary }: { includeFirst: boolean; label: string; primary?: boolean }) {
  const s = useSend(() => sendDueEmails(includeFirst));
  return (
    <span className="ai-action">
      <button type="button" className={primary ? "btn sm primary" : "btn sm"} disabled={s.pending} onClick={s.go} data-tip="Envoie tous ces emails en un clic depuis votre boîte connectée.">
        {s.pending ? "Envoi en cours…" : label}
      </button>
      {s.res.error && <span className="ai-msg error">{s.res.error}</span>}
      {s.res.ok && <span className="ai-msg">{s.res.ok}</span>}
    </span>
  );
}
