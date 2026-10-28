"use client";

import { useActionState } from "react";
import { renameOrganization } from "./actions";
import { FormMessage, SubmitButton } from "@/components/forms";

export function OrgForm({ name }: { name: string }) {
  const [state, action] = useActionState(renameOrganization, undefined);
  return (
    <form action={action} className="stack">
      <div className="row">
        <label className="field grow">
          <span className="label-text">Nom de l&apos;entreprise</span>
          <input className="input" name="name" required defaultValue={state?.values?.name ?? name} />
        </label>
        <SubmitButton pending="Enregistrement…">Enregistrer</SubmitButton>
      </div>
      <FormMessage error={state?.error} ok={state?.ok} />
    </form>
  );
}
