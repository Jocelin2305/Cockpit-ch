"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { deleteOrganization } from "./actions";

export function DataPanel({ orgName }: { orgName: string }) {
  const [state, action] = useActionState(deleteOrganization, undefined);
  const [open, setOpen] = useState(false);
  return (
    <section className="panel">
      <h2>Données de l&apos;entreprise</h2>
      <p className="muted">Téléchargez toutes vos données (prospects, séquences, appels, emails, équipe) dans un fichier, ou supprimez définitivement l&apos;entreprise.</p>
      <div className="row">
        <a className="btn" href="/app/parametres/export" download>Exporter toutes les données</a>
        <button type="button" className="btn danger" onClick={() => setOpen((o) => !o)}>Supprimer l&apos;entreprise…</button>
      </div>
      {open && (
        <form action={action} className="stack callres">
          <p><b>Suppression définitive.</b> Prospects, recherches, séquences, appels, emails, équipe et abonnement sont supprimés sans retour possible. Les comptes des membres rattachés uniquement à cette entreprise sont aussi supprimés.</p>
          <label className="field">
            <span className="label-text">Pour confirmer, tapez le nom de l&apos;entreprise : <b>{orgName}</b></span>
            <input className="input" name="confirm" autoComplete="off" required />
          </label>
          <FormMessage error={state?.error} />
          <SubmitButton className="btn danger armed" pending="Suppression…">Supprimer définitivement</SubmitButton>
        </form>
      )}
    </section>
  );
}
