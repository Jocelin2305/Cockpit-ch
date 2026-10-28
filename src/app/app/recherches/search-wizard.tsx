"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSearch, updateSearch, type SearchInput } from "./actions";

export type Preset = { id: string; label: string; name: string; data: Record<string, string>; templateId: string | null };
export type TemplateOption = { id: string; name: string; delays: number[]; usedBy: string[] };

const QUESTIONS = [
  { k: "geo", t: "Secteur géographique", d: "Où se trouvent vos prospects (pays, régions, villes) ?", ex: "Auvergne-Rhône-Alpes et Suisse romande" },
  { k: "secteur", t: "Secteur d'activité", d: "Quel type d'entreprises cibler ?", ex: "Groupes hôteliers boutique, cliniques privées, ESN" },
  { k: "ca", t: "Chiffre d'affaires visé", d: "CA des entreprises cibles, et votre objectif commercial si vous en avez un.", ex: "2 à 50 M€ de CA ; objectif 8 nouveaux clients d'ici juin" },
  { k: "salaries", t: "Fourchette de salariés", d: "Taille des entreprises cibles.", ex: "20 à 250 salariés" },
  { k: "motifs", t: "Motifs de prospection", d: "Votre objectif : vente directe, partenaires, revendeurs, nouveau marché…", ex: "Vente directe + 2 partenaires intégrateurs" },
  { k: "activite", t: "Détail de l'activité", d: "Ce que vous vendez, à quel prix, ce qui vous différencie.", ex: "Logiciel de planning, 290 €/mois, déployé en 48 h" },
] as const;
const EXTRAS = [
  ["prix", "Prix / panier moyen"], ["diff", "Différenciation"], ["fonctions", "Fonctions à viser"],
  ["volume", "Prospects dans la première liste"], ["ton", "Ton et langue des messages"],
] as const;
const FLOW = ["depart", ...QUESTIONS.map((q) => q.k), "sequence", "recap"];
const KEYS = ["geo", "secteur", "ca", "salaries", "motifs", "activite", "prix", "diff", "fonctions", "volume", "ton", "notes"];

const suggestName = (d: Record<string, string>) =>
  [d.secteur, d.geo].filter((s) => s?.trim()).map((s) => s.split(/[,;]/)[0].trim()).join(" — ").slice(0, 60);
const delaysLabel = (d: number[]) => `5 relances : J+${d.join(", ")}`;

export function SearchWizard({
  presets, templates, initial, searchId, initialTemplateId,
}: {
  presets: Preset[]; templates: TemplateOption[]; initial?: Record<string, string>; searchId?: string; initialTemplateId?: string | null;
}) {
  const editing = !!searchId;
  const router = useRouter();
  const [step, setStep] = useState(editing ? 1 : 0);
  const [data, setData] = useState<Record<string, string>>(initial ?? {});
  const [tpl, setTpl] = useState<string>(initialTemplateId ?? (editing ? "" : "standard"));
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const key = FLOW[step];
  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));

  const apply = (p: Preset, toRecap: boolean) => {
    setData({ ...p.data, name: toRecap ? `${p.name} (nouvelle)` : "" });
    if (p.templateId) setTpl(p.templateId);
    setStep(toRecap ? FLOW.indexOf("recap") : 1);
  };

  const submit = () => {
    setError("");
    const payload = Object.fromEntries(["name", ...KEYS].map((k) => [k, data[k] ?? ""])) as SearchInput;
    if (!payload.name?.trim()) payload.name = suggestName(data);
    start(async () => {
      const res = editing ? await updateSearch(searchId!, payload, tpl) : await createSearch(payload, tpl);
      if (res.error) setError(res.error);
      else router.push(`/app/recherches/${res.id}`);
    });
  };

  const q = QUESTIONS.find((x) => x.k === key);
  return (
    <div className="panel wizard">
      <div>
        <span className="label">{editing ? "Modifier la recherche" : "Nouvelle recherche"} · étape {step + 1} / {FLOW.length}</span>
        <div className="progress"><i style={{ width: `${Math.round((step / (FLOW.length - 1)) * 100)}%` }} /></div>
      </div>

      {key === "depart" && (
        <div className="stack">
          <h2>Comment voulez-vous démarrer ?</h2>
          <p className="muted">Réappliquez un paramétrage précédent en un clic, ou répondez aux 6 questions.</p>
          <div className="presets">
            {presets.map((p) => (
              <div key={p.id} className="preset">
                <span className="label">{p.label}</span>
                <b>{p.name}</b>
                <p className="muted small">{[p.data.geo, p.data.secteur, p.data.salaries && `${p.data.salaries} salariés`].filter(Boolean).join(" · ") || "Critères non renseignés"}</p>
                <div className="row">
                  <button type="button" className="btn sm primary" onClick={() => apply(p, true)}>Appliquer en un clic</button>
                  <button type="button" className="btn sm" onClick={() => apply(p, false)}>Partir de ces réponses</button>
                </div>
              </div>
            ))}
            <button type="button" className="preset choice" onClick={() => setStep(1)}>
              <b>Partir de zéro</b>
              <span className="muted small">Répondre aux 6 questions pour cette recherche.</span>
            </button>
          </div>
        </div>
      )}

      {q && (
        <div className="stack">
          <h2>{QUESTIONS.indexOf(q) + 1}. {q.t}</h2>
          <p className="muted">{q.d}</p>
          <label className="field">
            <span className="label-text">Votre réponse</span>
            <textarea className="input" rows={3} value={data[q.k] ?? ""} placeholder={q.ex} onChange={(e) => set(q.k, e.target.value)} autoFocus />
            <span className="hint">Ex. : {q.ex}</span>
          </label>
          {q.k === "activite" && (
            <div className="grid2">
              {EXTRAS.map(([k, l]) => (
                <label key={k} className="field">
                  <span className="label-text">{l}</span>
                  <input className="input" value={data[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {key === "sequence" && (
        <div className="stack">
          <h2>Séquence emails + LinkedIn</h2>
          <p className="muted">Chaque recherche a sa séquence : email J0, 5 relances programmées automatiquement, et LinkedIn en parallèle.</p>
          <div className="choices">
            {!editing && (
              <button type="button" className="choice" aria-pressed={tpl === "standard"} onClick={() => setTpl("standard")}>
                <b>Nouvelle séquence à partir du modèle standard</b>
                <span className="muted small">Une copie propre à cette recherche, à personnaliser. La rédaction sur mesure par l&apos;IA arrive avec l&apos;assistant.</span>
              </button>
            )}
            {templates.map((t) => (
              <button key={t.id} type="button" className="choice" aria-pressed={tpl === t.id} onClick={() => setTpl(t.id)}>
                <b>{t.name}</b>
                <span className="muted small">{delaysLabel(t.delays)}{t.usedBy.length ? ` · utilisée par ${t.usedBy.join(", ")}` : ""}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {key === "recap" && (
        <div className="stack">
          <h2>Récapitulatif</h2>
          <label className="field">
            <span className="label-text">Nom de la recherche</span>
            <input className="input" value={data.name ?? suggestName(data)} onChange={(e) => set("name", e.target.value)} placeholder="Ex. : Cliniques privées Lyon, DRH" />
          </label>
          <dl className="recap">
            {QUESTIONS.map((x) => (
              <div key={x.k}><dt>{x.t}</dt><dd>{data[x.k]?.trim() || <span className="enrich">non renseigné</span>}</dd></div>
            ))}
            <div><dt>Fonctions visées</dt><dd>{data.fonctions || "—"}</dd></div>
            <div>
              <dt>Séquence</dt>
              <dd>
                {tpl === "standard" ? "Nouvelle séquence (modèle standard)" : templates.find((t) => t.id === tpl)?.name ?? "aucune"}{" "}
                <button type="button" className="btn sm ghost" onClick={() => setStep(FLOW.indexOf("sequence"))}>Changer</button>
              </dd>
            </div>
          </dl>
          <label className="field">
            <span className="label-text">Notes, signaux à chercher (optionnel)</span>
            <textarea className="input" rows={2} value={data.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </label>
        </div>
      )}

      {error && <p className="alert error">{error}</p>}
      <div className="row between">
        <div>{step > (editing ? 1 : 0) && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Retour</button>}</div>
        <div className="row">
          {editing && key !== "recap" && <button type="button" className="btn" onClick={submit} disabled={pending}>Enregistrer maintenant</button>}
          {key === "recap" ? (
            <button type="button" className="btn primary" onClick={submit} disabled={pending}>
              {pending ? "Enregistrement…" : editing ? "Enregistrer" : "Créer la recherche"}
            </button>
          ) : key !== "depart" ? (
            <button type="button" className="btn primary" onClick={() => setStep(step + 1)}>Suivant</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
