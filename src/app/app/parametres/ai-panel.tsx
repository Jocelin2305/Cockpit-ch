"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { connectAiKey, disconnectAiKey } from "../ai-key-actions";

export function AiPanel({ connected, platform }: { connected: boolean; platform: boolean }) {
  const [state, action] = useActionState(connectAiKey, undefined);
  return (
    <section className="panel">
      <div className="panel-head"><h2>Claude</h2><span className="chip ok">recommandé</span></div>
      {connected ? (
        <>
          <p>Connecté : <span className="chip ok">votre clé Claude</span></p>
          <p className="muted small">Le Copilote IA, les angles, les séquences et les comptes rendus d&apos;appels utilisent votre compte Claude. Vos données ne servent pas à entraîner les modèles.</p>
          <form action={disconnectAiKey}><SubmitButton className="btn" pending="…">Déconnecter</SubmitButton></form>
        </>
      ) : (
        <form action={action} className="stack">
          {platform && <p className="muted small">En attendant votre clé, la clé fournie par la plateforme est utilisée.</p>}
          <div className="row">
            <label className="field grow">
              <span className="label-text">Clé API Claude</span>
              <input className="input mono" name="key" type="password" autoComplete="off" required placeholder="sk-ant-…" />
            </label>
            <SubmitButton pending="Vérification…">Connecter</SubmitButton>
          </div>
          <p className="muted small">Créez-la sur console.anthropic.com → API Keys. Elle est vérifiée puis enregistrée chiffrée ; la consommation est facturée sur votre compte Claude.</p>
          <FormMessage error={state?.error} ok={state?.ok} />
        </form>
      )}
    </section>
  );
}
