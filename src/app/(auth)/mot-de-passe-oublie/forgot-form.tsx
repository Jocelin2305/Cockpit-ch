"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="stack">
      <FormMessage error={state?.error} ok={state?.ok} />
      <label className="field">
        <span className="label-text">Email</span>
        <input className="input" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
      </label>
      <SubmitButton pending="Envoi…">Recevoir le lien</SubmitButton>
    </form>
  );
}
