"use client";

import { useActionState } from "react";
import { CRM_HELP, CRM_PROVIDERS, type CrmProvider } from "@/lib/crm-providers";
import { FormMessage, SubmitButton } from "@/components/forms";
import { connectCrm, disconnectCrm } from "../crm-actions";

export function CrmPanel({ provider }: { provider: string | null }) {
  const [state, action] = useActionState(connectCrm, undefined);
  const p = provider as CrmProvider | null;
  return (
    <section className="panel" data-tip="Connectez votre CRM : le bouton « Mettre à jour mon CRM » apparaît dans Prospects et y envoie vos fiches.">
      <h2>CRM</h2>
      {p && CRM_PROVIDERS[p] ? (
        <>
          <p>Connecté : <span className="chip ok">{CRM_PROVIDERS[p]}</span></p>
          <p className="muted small">Dans Prospects, « Mettre à jour mon CRM » crée ou met à jour les contacts de la bibliothèque ouverte.</p>
          <form action={disconnectCrm}><SubmitButton className="btn" pending="…">Déconnecter</SubmitButton></form>
        </>
      ) : (
        <form action={action} className="stack">
          <div className="row">
            <label className="field">
              <span className="label-text">Votre CRM</span>
              <select className="input" name="provider" defaultValue="hubspot">
                {Object.entries(CRM_PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="field grow">
              <span className="label-text">Jeton d&apos;accès</span>
              <input className="input mono" name="token" type="password" autoComplete="off" required />
            </label>
            <SubmitButton pending="Vérification…">Connecter</SubmitButton>
          </div>
          <ul className="muted small">{Object.entries(CRM_HELP).map(([k, v]) => <li key={k}>{v}</li>)}</ul>
          <FormMessage error={state?.error} ok={state?.ok} />
        </form>
      )}
    </section>
  );
}
