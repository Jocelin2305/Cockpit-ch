"use client";

import { useActionState } from "react";
import { saveSignature } from "./actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function SignatureForm({ signature }: { signature: string }) {
  const [state, action] = useActionState(saveSignature, undefined);
  return (
    <form action={action} className="stack">
      <textarea className="input" name="signature" rows={4} defaultValue={state?.values?.signature ?? signature} placeholder={"Prénom Nom\nFonction, Société\nTéléphone"} aria-label="Signature" />
      <FormMessage error={state?.error} ok={state?.ok} />
      <div className="row"><SubmitButton pending="Enregistrement…">Enregistrer</SubmitButton></div>
    </form>
  );
}
