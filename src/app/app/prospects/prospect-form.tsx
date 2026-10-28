"use client";

import { useActionState } from "react";
import { saveProspect } from "./actions";
import { FormMessage, SubmitButton } from "@/components/forms";
import { FIELDS, PRIO, type FieldDef } from "@/lib/prospecting";

type Values = Record<string, string | null | undefined>;

const GROUPS: { g: FieldDef["group"]; title: string; note?: string }[] = [
  { g: "ind", title: "Indispensables" },
  { g: "coord", title: "Coordonnées", note: "N'inscrivez que des données vérifiées (site officiel, presse, outil d'enrichissement). Sinon, laissez vide : jamais de devinette." },
  { g: "util", title: "Très utiles" },
  { g: "opt", title: "Optionnel mais précieux" },
  { g: "pil", title: "Pilotage" },
];

export function ProspectForm({
  initial, id, searches, emailVerified,
}: { initial: Values; id?: string; searches: { id: string; name: string }[]; emailVerified?: boolean }) {
  const [state, action] = useActionState(saveProspect, undefined);
  const v = (k: string) => (state?.values?.[k] ?? initial[k] ?? "") as string;
  return (
    <form action={action} className="stack">
      {id && <input type="hidden" name="id" value={id} />}
      <FormMessage error={state?.error} ok={state?.ok} />
      <fieldset className="fs">
        <legend>Classement</legend>
        <label className="field">
          <span className="label-text">Recherche</span>
          <select className="input" name="searchId" defaultValue={v("searchId")}>
            <option value="">Aucune</option>
            {searches.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label-text">Priorité</span>
          <select className="input" name="priority" defaultValue={v("priority") || "B"}>
            {Object.entries(PRIO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
      </fieldset>
      {GROUPS.map(({ g, title, note }) => (
        <fieldset key={g} className="fs">
          <legend>{title}</legend>
          {FIELDS.filter((f) => f.group === g).map((f) => (
            <label key={f.key} className={`field${f.area ? " full" : ""}`}>
              <span className="label-text">{f.label}</span>
              {f.key === "canal" ? (
                <select className="input" name={f.key} defaultValue={v(f.key)}>
                  {["", "Email", "LinkedIn", "Téléphone"].map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                </select>
              ) : f.area ? (
                <textarea className="input" name={f.key} rows={2} defaultValue={v(f.key)} required={f.key === "company"} />
              ) : (
                <input className="input" name={f.key} defaultValue={v(f.key)} required={f.key === "company"} />
              )}
              {f.key === "email" && (
                <span className="check"><input type="checkbox" name="emailVerified" defaultChecked={emailVerified} /> Email vérifié</span>
              )}
            </label>
          ))}
          {note && <p className="hint full">{note}</p>}
        </fieldset>
      ))}
      <div className="row">
        <SubmitButton pending="Enregistrement…">{id ? "Enregistrer la fiche" : "Créer le prospect"}</SubmitButton>
      </div>
    </form>
  );
}
