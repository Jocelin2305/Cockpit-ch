"use client";

import { useActionState } from "react";
import { acceptAsNewUser } from "./actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function AcceptForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptAsNewUser, undefined);
  return (
    <form action={action} className="stack">
      <FormMessage error={state?.error} />
      <input type="hidden" name="token" value={token} />
      <label className="field">
        <span className="label-text">Votre nom</span>
        <input className="input" name="name" autoComplete="name" required defaultValue={state?.values?.name} />
      </label>
      <label className="field">
        <span className="label-text">Mot de passe</span>
        <input className="input" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <span className="hint">10 caractères minimum.</span>
      </label>
      <SubmitButton pending="Création de l'accès…">Créer mon accès</SubmitButton>
    </form>
  );
}
