"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "../../actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="stack">
      <FormMessage error={state?.error} />
      {state?.error?.includes("plus valable") && <Link href="/mot-de-passe-oublie">Refaire une demande</Link>}
      <input type="hidden" name="token" value={token} />
      <label className="field">
        <span className="label-text">Nouveau mot de passe (10 caractères minimum)</span>
        <input className="input" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </label>
      <SubmitButton pending="Enregistrement…">Enregistrer et me reconnecter</SubmitButton>
    </form>
  );
}
