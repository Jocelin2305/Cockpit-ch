"use client";

import { useActionState } from "react";
import { inviteMember } from "./actions";
import { CopyField, FormMessage, SubmitButton } from "@/components/forms";

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, undefined);
  return (
    <form action={action} className="stack">
      <div className="row">
        <label className="field grow">
          <span className="label-text">Email</span>
          <input className="input" name="email" type="email" required defaultValue={state?.error ? state.values?.email : ""} />
        </label>
        <label className="field">
          <span className="label-text">Rôle</span>
          <select className="input" name="role" defaultValue={state?.values?.role ?? "MEMBER"}>
            <option value="MEMBER">Commercial</option>
            <option value="ADMIN">Administrateur</option>
          </select>
        </label>
        <SubmitButton pending="Création…">Créer l&apos;invitation</SubmitButton>
      </div>
      <FormMessage error={state?.error} ok={state?.ok} />
      {state?.link && <CopyField label="Lien d'invitation" value={state.link} />}
      <p className="hint">L&apos;envoi automatique de l&apos;invitation par email arrivera avec la configuration de votre domaine.</p>
    </form>
  );
}
