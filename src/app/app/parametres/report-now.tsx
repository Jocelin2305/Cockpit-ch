"use client";

import { useState, useTransition } from "react";
import { sendReportNow } from "./actions";

export function ReportNowButton() {
  const [res, setRes] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();
  return (
    <span className="ai-action">
      <button type="button" className="btn sm" disabled={pending} onClick={() => start(async () => setRes(await sendReportNow()))}>{pending ? "Envoi…" : "M'envoyer le rapport maintenant"}</button>
      {res.error && <span className="ai-msg error">{res.error}</span>}
      {res.ok && <span className="ai-msg">{res.ok}</span>}
    </span>
  );
}
