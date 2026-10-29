"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { OFFERS, VIDEO_CATEGORIES } from "@/lib/reseller-offers";
import { addVideo, createReseller, sendResellerMessage } from "./actions";

export function ResellerForm() {
  const [state, action] = useActionState(createReseller, undefined);
  const v = state?.error ? state.values : undefined;
  return (
    <div className="stack">
      <form action={action} className="row">
        <label className="field grow"><span className="label-text">Entreprise du revendeur</span><input className="input" name="company" required defaultValue={v?.company} /></label>
        <label className="field grow"><span className="label-text">Email du gérant (son identifiant)</span><input className="input" name="email" type="email" required defaultValue={v?.email} /></label>
        <label className="field"><span className="label-text">Formule</span>
          <select className="input" name="offer" defaultValue={v?.offer ?? OFFERS[0].id}>
            {OFFERS.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.monthly} € / mois · commission {Math.round(o.rate * 100)} %</option>)}
          </select>
        </label>
        <label className="check"><input type="checkbox" name="send" value="1" /> Envoyer l&apos;invitation</label>
        <SubmitButton pending="Création…">Ajouter le revendeur</SubmitButton>
      </form>
      <FormMessage error={state?.error} ok={state?.ok} />
      {state?.link && <input className="input mono" readOnly value={state.link} aria-label="Lien d'invitation" onFocus={(e) => e.currentTarget.select()} />}
    </div>
  );
}

export function MessageForm() {
  const [state, action] = useActionState(sendResellerMessage, undefined);
  const v = state?.error ? state.values : undefined;
  return (
    <form action={action} className="stack" key={state?.ok}>
      <label className="field"><span className="label-text">Objet</span><input className="input" name="subject" required maxLength={150} defaultValue={v?.subject} /></label>
      <label className="field"><span className="label-text">Message</span><textarea className="input" name="body" rows={5} required maxLength={5000} defaultValue={v?.body} /></label>
      <div className="row">
        <label className="check"><input type="checkbox" name="email" value="1" defaultChecked /> Envoyer aussi par email</label>
        <SubmitButton pending="Envoi…">Envoyer à tous les revendeurs</SubmitButton>
      </div>
      <FormMessage error={state?.error} ok={state?.ok} />
    </form>
  );
}

export function VideoForm() {
  const [state, action] = useActionState(addVideo, undefined);
  const v = state?.error ? state.values : undefined;
  return (
    <form action={action} className="stack" key={state?.ok}>
      <div className="row">
        <label className="field"><span className="label-text">Rubrique</span>
          <select className="input" name="category" defaultValue={v?.category ?? "demo"}>
            {VIDEO_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="field grow"><span className="label-text">Titre</span><input className="input" name="title" required defaultValue={v?.title} /></label>
        <label className="field grow"><span className="label-text">Lien YouTube</span><input className="input" name="url" type="url" required placeholder="https://youtu.be/…" defaultValue={v?.url} /></label>
        <SubmitButton pending="Ajout…">Ajouter</SubmitButton>
      </div>
      <FormMessage error={state?.error} ok={state?.ok} />
    </form>
  );
}
