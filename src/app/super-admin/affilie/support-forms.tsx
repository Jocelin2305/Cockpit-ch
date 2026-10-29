"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { createFeatureRequest, createTicket } from "./actions";

export function TicketForm({ hours }: { hours: number }) {
  const [state, action] = useActionState(createTicket, undefined);
  const v = state?.error ? state.values : undefined;
  return (
    <form action={action} className="stack" key={state?.ok}>
      <label className="field"><span className="label-text">Objet</span><input className="input" name="subject" required maxLength={150} defaultValue={v?.subject} /></label>
      <label className="field"><span className="label-text">Votre demande</span><textarea className="input" name="body" rows={4} required maxLength={5000} defaultValue={v?.body} /></label>
      <div className="row"><SubmitButton pending="Envoi…">Envoyer au support</SubmitButton><span className="muted small">Réponse visée sous {hours} h.</span></div>
      <FormMessage error={state?.error} ok={state?.ok} />
    </form>
  );
}

export function FeatureForm() {
  const [state, action] = useActionState(createFeatureRequest, undefined);
  const v = state?.error ? state.values : undefined;
  return (
    <form action={action} className="stack" key={state?.ok}>
      <label className="field"><span className="label-text">Fonctionnalité souhaitée</span><input className="input" name="title" required maxLength={150} defaultValue={v?.title} /></label>
      <label className="field"><span className="label-text">Description et intérêt pour vos clients</span><textarea className="input" name="body" rows={4} required maxLength={5000} defaultValue={v?.body} /></label>
      <SubmitButton pending="Envoi…">Envoyer ma demande du trimestre</SubmitButton>
      <FormMessage error={state?.error} ok={state?.ok} />
    </form>
  );
}
