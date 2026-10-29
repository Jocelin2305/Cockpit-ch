"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { connectApollo, disconnectApollo } from "../sourcing-actions";

export function ApolloPanel({ connected }: { connected: boolean }) {
  const [state, action] = useActionState(connectApollo, undefined);
  return (
    <section className="panel" data-tip="Avec votre compte Apollo, la recherche automatique complète l'email, le LinkedIn et le poste de chaque contact.">
      <h2>Apollo (enrichissement des contacts)</h2>
      {connected ? (
        <>
          <p>Connecté : <span className="chip ok">Apollo</span></p>
          <p className="muted small">Chaque lancement de recherche enrichit les nouveaux prospects ; « Enrichir avec Apollo » complète les autres. 1 crédit Apollo par contact trouvé.</p>
          <form action={disconnectApollo}><SubmitButton className="btn" pending="…">Déconnecter</SubmitButton></form>
        </>
      ) : (
        <form action={action} className="stack">
          <div className="row">
            <label className="field grow">
              <span className="label-text">Clé API Apollo</span>
              <input className="input mono" name="key" type="password" autoComplete="off" required />
            </label>
            <SubmitButton pending="Vérification…">Connecter</SubmitButton>
          </div>
          <p className="muted small">Apollo : Settings → Integrations → API → créez une clé. L&apos;accès à l&apos;API dépend de votre offre Apollo. La clé est vérifiée puis enregistrée chiffrée.</p>
          <FormMessage error={state?.error} ok={state?.ok} />
        </form>
      )}
    </section>
  );
}
