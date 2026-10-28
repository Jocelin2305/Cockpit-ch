"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="stack">
      <FormMessage error={state?.error} />
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span className="label-text">Email</span>
        <input className="input" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
      </label>
      <label className="field">
        <span className="label-text">Mot de passe</span>
        <input className="input" name="password" type="password" autoComplete="current-password" required />
      </label>
      <SubmitButton pending="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}
