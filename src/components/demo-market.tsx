"use client";

import { useActionState } from "react";
import { demoMarketSearch } from "@/app/app/sourcing-actions";
import { SECTIONS } from "@/lib/sourcing-data";
import { FormMessage, SubmitButton } from "@/components/forms";

// Démo : vraie recherche dans le registre des entreprises, sur le marché du visiteur.
export function DemoMarket() {
  const [state, action] = useActionState(demoMarketSearch, undefined);
  const v = state?.values;
  return (
    <section className="panel demo-market" data-tour="market">
      <h2>Essayez sur votre marché</h2>
      <p className="muted small">Choisissez un secteur et un département : Cockpit&apos;ch trouve en quelques secondes de vraies entreprises actives, avec leur dirigeant, et les range dans une bibliothèque prête à prospecter.</p>
      <form action={action} className="row">
        <label className="field">
          <span className="label-text">Secteur</span>
          <select className="input" name="section" defaultValue={v?.section ?? "F"}>
            {SECTIONS.slice(0, 19).map(([c, l]) => <option key={c} value={c}>{l}</option>)}
          </select>
        </label>
        <label className="field"><span className="label-text">Département(s)</span><input className="input" name="deps" required placeholder="Ex. : 69" defaultValue={v?.deps} /></label>
        <label className="field grow"><span className="label-text">Mot-clé (facultatif)</span><input className="input" name="keyword" placeholder="Ex. : menuiserie" defaultValue={v?.keyword} /></label>
        <SubmitButton pending="Recherche…">Trouver mes prospects</SubmitButton>
      </form>
      <FormMessage error={state?.error} />
    </section>
  );
}
