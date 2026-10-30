"use client";

import { useActionState } from "react";
import { saveOrganization } from "./actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function OrgForm({ name, defaultSignature }: { name: string; defaultSignature: string }) {
  const [state, action] = useActionState(saveOrganization, undefined);
  return (
    <form action={action} className="stack">
      <label className="field">
        <span className="label-text">Nom de l&apos;entreprise</span>
        <input className="input" name="name" required defaultValue={state?.values?.name ?? name} />
      </label>
      <label className="field">
        <span className="label-text">Signature de l&apos;équipe</span>
        <textarea className="input" name="defaultSignature" rows={4} defaultValue={state?.values?.defaultSignature ?? defaultSignature} placeholder={"{nom}\nFonction, Société\nTéléphone"} />
        <span className="muted small">Préremplit la signature de chaque utilisateur, qui peut ensuite l&apos;adapter. {"{nom}"} est remplacé par le nom de l&apos;utilisateur.</span>
      </label>
      <FormMessage error={state?.error} ok={state?.ok} />
      <div className="row"><SubmitButton pending="Enregistrement…">Enregistrer</SubmitButton></div>
    </form>
  );
}
