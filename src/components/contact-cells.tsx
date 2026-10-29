"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendNextEmail } from "@/app/app/mail-actions";
import { enrichProspect } from "@/app/app/sourcing-actions";
import { PhoneLink, type CallTarget } from "./call-dock";

type Res = { ok?: string; error?: string };

function useRun() {
  const router = useRouter();
  const [res, setRes] = useState<Res>({});
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Res>) => start(async () => { setRes(await fn()); router.refresh(); });
  return { res, pending, run };
}

const Msg = ({ res }: { res: Res }) => (res.error ? <span className="ai-msg error">{res.error}</span> : res.ok ? <span className="ai-msg">{res.ok}</span> : null);

// Bouton « Enrichir » : débloque email et téléphone avec Apollo.
function EnrichButton({ id }: { id: string }) {
  const { res, pending, run } = useRun();
  return (
    <span className="ai-action">
      <button type="button" className="btn sm" disabled={pending} onClick={() => run(() => enrichProspect(id))}>{pending ? "…" : "Enrichir"}</button>
      <Msg res={res} />
    </span>
  );
}

// Email : un clic lance la séquence de ce prospect (email suivant, depuis la boîte connectée).
export function EmailCell({ id, email, company, canSend }: { id: string; email: string; company: string; canSend: boolean }) {
  const { res, pending, run } = useRun();
  if (!email) return <EnrichButton id={id} />;
  return (
    <span className="ai-action">
      <button
        type="button"
        className="link-btn"
        disabled={pending || !canSend}
        title={canSend ? "Lancer la séquence : envoie l'email suivant à ce contact" : "Séquence terminée ou stoppée"}
        onClick={() => window.confirm(`Envoyer l'email suivant de la séquence à ${email} (${company}) ?`) && run(() => sendNextEmail(id))}
      >
        {pending ? "Envoi…" : email}
      </button>
      <Msg res={res} />
    </span>
  );
}

// Téléphone : un clic lance l'appel avec la téléphonie (Voice IP) et ouvre la prise de notes.
export function PhoneCell({ p }: { p: CallTarget }) {
  if (!p.phone) return <EnrichButton id={p.id} />;
  return <PhoneLink p={p} />;
}
