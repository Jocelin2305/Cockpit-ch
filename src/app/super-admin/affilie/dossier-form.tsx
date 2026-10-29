"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { saveDossier } from "./actions";

type Dossier = { companyName: string; siret: string; address: string; managerName: string; managerEmail: string; managerPhone: string; bic: string; ibanLast4: string };

export function DossierForm({ d }: { d: Dossier }) {
  const [state, action] = useActionState(saveDossier, undefined);
  const v: Record<string, string> = state?.error && state.values ? state.values : d;
  const field = (name: keyof Dossier, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field"><span className="label-text">{label}</span><input className="input" name={name} required defaultValue={v[name]} {...props} /></label>
  );
  return (
    <form action={action} className="stack">
      <div className="grid2">
        {field("companyName", "Nom de l'entreprise")}
        {field("siret", "Numéro SIRET", { inputMode: "numeric", placeholder: "14 chiffres" })}
      </div>
      {field("address", "Adresse du siège")}
      <div className="grid2">
        {field("managerName", "Nom et prénom du gérant")}
        {field("managerEmail", "Email du gérant", { type: "email" })}
        {field("managerPhone", "Téléphone du gérant", { type: "tel" })}
      </div>
      <div className="grid2">
        <label className="field">
          <span className="label-text">IBAN (RIB){d.ibanLast4 ? ` · enregistré, se termine par ${d.ibanLast4}` : ""}</span>
          <input className="input mono" name="iban" autoComplete="off" required={!d.ibanLast4} placeholder={d.ibanLast4 ? "Laisser vide pour conserver l'IBAN enregistré" : "FR76 …"} />
        </label>
        {field("bic", "BIC", { required: false, placeholder: "8 ou 11 caractères" })}
      </div>
      <p className="muted small">Votre IBAN est chiffré : seul le fondateur peut le lire, pour vous verser vos commissions.</p>
      <SubmitButton pending="Enregistrement…">Enregistrer mon dossier</SubmitButton>
      <FormMessage error={state?.error} ok={state?.ok} />
    </form>
  );
}
