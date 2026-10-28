"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { createClient, enterOrganization } from "./actions";

export function ClientForm() {
  const [state, action] = useActionState(createClient, undefined);
  return (
    <div className="stack">
      <form action={action} className="row">
        <label className="field grow"><span className="label-text">Entreprise cliente</span><input className="input" name="company" required defaultValue={state?.error ? state.values?.company : ""} /></label>
        <label className="field grow"><span className="label-text">Email de son administrateur</span><input className="input" name="email" type="email" required defaultValue={state?.error ? state.values?.email : ""} /></label>
        <SubmitButton pending="Création…">Créer le compte client</SubmitButton>
      </form>
      <FormMessage error={state?.error} ok={state?.ok} />
      {state?.link && (
        <div className="stack">
          <input className="input mono" readOnly value={state.link} aria-label="Lien d'invitation" onFocus={(e) => e.currentTarget.select()} />
          <form action={enterOrganization}>
            <input type="hidden" name="id" value={state.values?.orgId ?? ""} />
            <SubmitButton>Paramétrer son espace maintenant →</SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
