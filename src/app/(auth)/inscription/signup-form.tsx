"use client";

import { useActionState } from "react";
import { signup } from "../actions";
import { FormMessage, SubmitButton } from "@/components/forms";
import { TermsCheck } from "@/components/terms-check";

export function SignupForm({ partner }: { partner?: string }) {
  const [state, action] = useActionState(signup, undefined);
  const v = state?.values ?? {};
  return (
    <form action={action} className="stack">
      {partner && <input type="hidden" name="partner" value={partner} />}
      <FormMessage error={state?.error} />
      <label className="field">
        <span className="label-text">Votre nom</span>
        <input className="input" name="name" autoComplete="name" required defaultValue={v.name} />
      </label>
      <label className="field">
        <span className="label-text">Nom de l&apos;entreprise</span>
        <input className="input" name="company" autoComplete="organization" required defaultValue={v.company} />
      </label>
      <label className="field">
        <span className="label-text">Email professionnel</span>
        <input className="input" name="email" type="email" autoComplete="email" required defaultValue={v.email} />
      </label>
      <label className="field">
        <span className="label-text">Mot de passe</span>
        <input className="input" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <span className="hint">10 caractères minimum.</span>
      </label>
      <TermsCheck />
      <SubmitButton pending="Création de l'espace…">Créer mon espace</SubmitButton>
    </form>
  );
}
