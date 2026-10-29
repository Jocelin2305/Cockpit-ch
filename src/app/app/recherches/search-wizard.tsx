"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSearch, updateSearch, type SearchInput } from "./actions";
import { ciblageLabel, codes, EFFECTIFS, REGIONS, SECTIONS } from "@/lib/sourcing-data";

export type Preset = { id: string; label: string; name: string; data: Record<string, string>; templateId: string | null };
export type TemplateOption = { id: string; name: string; delays: number[]; usedBy: string[] };

// Questionnaire en 5 étapes : départ, cible (sert aussi à la recherche automatique), offre, contacts, récapitulatif.
// La séquence email se prépare toute seule ; elle se lance ensuite depuis le tableau des prospects.
const FLOW = ["depart", "cible", "offre", "contacts", "recap"] as const;
const STEP_TITLE: Record<(typeof FLOW)[number], string> = { depart: "Départ", cible: "Votre cible", offre: "Votre offre", contacts: "Les contacts", recap: "Récapitulatif" };
const SRC_KEYS = ["srcRegion", "srcDeps", "srcSection", "srcNaf", "srcKeyword", "srcEffectifs", "srcCaMin", "srcCaMax"];
const KEYS = ["geo", "secteur", "ca", "salaries", "motifs", "activite", "prix", "diff", "fonctions", "volume", "ton", "notes", ...SRC_KEYS];

const CA_RANGES: [string, string, string][] = [
  ["", "", "Peu importe"], ["0", "2000000", "Moins de 2 M€"], ["2000000", "10000000", "2 à 10 M€"],
  ["10000000", "50000000", "10 à 50 M€"], ["50000000", "250000000", "50 à 250 M€"], ["250000000", "", "Plus de 250 M€"],
];
const MOTIFS = ["Vente directe", "Trouver des partenaires", "Trouver des revendeurs", "Ouvrir un nouveau marché", "Relancer d'anciens clients"];
const FONCTIONS = ["Dirigeant", "Directeur général", "Directeur commercial", "Directeur marketing", "DRH", "DAF", "DSI", "Responsable achats", "Directeur d'exploitation", "Directeur technique"];
const VOLUMES = ["25", "50", "100"];
const TONS = ["Professionnel, vouvoiement", "Direct et concis", "Chaleureux et humain", "Anglais professionnel"];

const list = (v: string | undefined) => (v ?? "").split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
const caKey = (d: Record<string, string>) => `${d.srcCaMin ?? ""}-${d.srcCaMax ?? ""}`;

// Les champs texte lus par l'IA sont déduits des choix : plus de question posée deux fois.
function derive(d: Record<string, string>) {
  const region = REGIONS.find(([c]) => c === d.srcRegion)?.[1];
  const section = SECTIONS.find(([c]) => c === d.srcSection)?.[1];
  const effectifs = codes(d.srcEffectifs ?? "").map((c) => EFFECTIFS.find(([k]) => k === c)?.[1]).filter(Boolean);
  return {
    geo: [region, d.srcDeps && `départements ${codes(d.srcDeps).join(", ")}`].filter(Boolean).join(", "),
    secteur: [section, d.srcNaf && `NAF ${codes(d.srcNaf).join(", ")}`, d.srcKeyword && `« ${d.srcKeyword} »`].filter(Boolean).join(", "),
    salaries: effectifs.length ? `${effectifs.join(", ")} salariés` : "",
    ca: CA_RANGES.find(([a, b]) => `${a}-${b}` === caKey(d))?.[2] ?? "",
  };
}

const suggestName = (d: Record<string, string>) => {
  const x = derive(d);
  return [x.secteur.split(",")[0], x.geo.split(",")[0]].filter((s) => s?.trim()).join(" — ").slice(0, 60);
};

export function SearchWizard({
  presets, templates, initial, searchId, initialTemplateId, aiEnabled = false,
}: {
  presets: Preset[]; templates: TemplateOption[]; initial?: Record<string, string>; searchId?: string; initialTemplateId?: string | null; aiEnabled?: boolean;
}) {
  const editing = !!searchId;
  const router = useRouter();
  const [step, setStep] = useState(editing ? 1 : 0);
  const [data, setData] = useState<Record<string, string>>({ volume: "50", ton: TONS[0], ...(initial ?? {}) });
  const [tpl, setTpl] = useState<string>(initialTemplateId ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const key = FLOW[step];
  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const toggle = (k: string, v: string, sep = ",") => setData((d) => {
    const cur = k === "srcEffectifs" ? codes(d[k] ?? "") : list(d[k]);
    return { ...d, [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(sep) };
  });

  const apply = (p: Preset, toRecap: boolean) => {
    setData({ volume: "50", ton: TONS[0], ...p.data, name: toRecap ? `${p.name} (nouvelle)` : "" });
    if (p.templateId) setTpl(p.templateId);
    setStep(toRecap ? FLOW.indexOf("recap") : 1);
  };

  const submit = () => {
    setError("");
    // Les champs déduits ne remplacent l'existant que s'ils sont renseignés (anciennes recherches).
    const merged: Record<string, string> = { ...data, ...Object.fromEntries(Object.entries(derive(data)).filter(([, v]) => v)) };
    const payload = Object.fromEntries(["name", ...KEYS].map((k) => [k, merged[k] ?? ""])) as SearchInput;
    if (!payload.name?.trim()) payload.name = suggestName(data) || "Nouvelle recherche";
    start(async () => {
      // Création : séquence rédigée par l'IA si elle est connectée, sinon copie du modèle standard.
      const res = editing ? await updateSearch(searchId!, payload, tpl) : await createSearch(payload, tpl || (aiEnabled ? "ai" : "standard"));
      if (res.error) setError(res.error);
      else router.push(`/app/recherches/${res.id}${"warning" in res && res.warning ? `?alerte=${encodeURIComponent(res.warning)}` : ""}`);
    });
  };

  const fonctions = list(data.fonctions);
  const extraFonctions = fonctions.filter((f) => !FONCTIONS.includes(f));
  return (
    <div className="panel wizard">
      <div>
        <span className="label">{editing ? "Modifier la recherche" : "Nouvelle recherche"} · étape {step + 1} / {FLOW.length} · {STEP_TITLE[key]}</span>
        <div className="progress"><i style={{ width: `${Math.round((step / (FLOW.length - 1)) * 100)}%` }} /></div>
      </div>

      {key === "depart" && (
        <div className="stack">
          <h2>Comment voulez-vous démarrer ?</h2>
          <p className="muted">Réappliquez un paramétrage précédent en un clic, ou répondez aux questions (2 minutes).</p>
          <div className="presets">
            {presets.map((p) => (
              <div key={p.id} className="preset">
                <span className="label">{p.label}</span>
                <b>{p.name}</b>
                <p className="muted small">{ciblageLabel(p.data) || "Critères non renseignés"}</p>
                <div className="row">
                  <button type="button" className="btn sm primary" onClick={() => apply(p, true)}>Appliquer en un clic</button>
                  <button type="button" className="btn sm" onClick={() => apply(p, false)}>Partir de ces réponses</button>
                </div>
              </div>
            ))}
            <button type="button" className="preset choice" onClick={() => setStep(1)}>
              <b>Partir de zéro</b>
              <span className="muted small">Quelques choix dans des listes : cible, offre, contacts.</span>
            </button>
          </div>
        </div>
      )}

      {key === "cible" && (
        <div className="stack">
          <h2>Qui voulez-vous prospecter ?</h2>
          <p className="muted">Ces choix servent à la fois à trouver les entreprises et à écrire les messages. Indiquez au moins une zone ou un secteur.</p>
          <div className="grid2">
            <label className="field">
              <span className="label-text">Région</span>
              <select className="input" value={data.srcRegion ?? ""} onChange={(e) => set("srcRegion", e.target.value)}>
                <option value="">Toute la France</option>
                {REGIONS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label-text">Départements (facultatif)</span>
              <input className="input" value={data.srcDeps ?? ""} onChange={(e) => set("srcDeps", e.target.value)} placeholder="Ex. : 69, 38, 01" />
            </label>
            <label className="field">
              <span className="label-text">Secteur d&apos;activité</span>
              <select className="input" value={data.srcSection ?? ""} onChange={(e) => set("srcSection", e.target.value)}>
                <option value="">Tous secteurs</option>
                {SECTIONS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label-text">Chiffre d&apos;affaires</span>
              <select className="input" value={caKey(data)} onChange={(e) => { const [a, b] = e.target.value.split("-"); setData((d) => ({ ...d, srcCaMin: a, srcCaMax: b })); }}>
                {CA_RANGES.map(([a, b, l]) => <option key={l} value={`${a}-${b}`}>{l}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label-text">Mot-clé dans le nom (facultatif)</span>
              <input className="input" value={data.srcKeyword ?? ""} onChange={(e) => set("srcKeyword", e.target.value)} placeholder="Ex. : clinique, menuiserie" />
            </label>
            <label className="field">
              <span className="label-text">Codes NAF précis (facultatif)</span>
              <input className="input" value={data.srcNaf ?? ""} onChange={(e) => set("srcNaf", e.target.value)} placeholder="Ex. : 86.10Z" />
            </label>
          </div>
          <div className="field">
            <span className="label-text">Nombre de salariés</span>
            <div className="chips-pick">
              {EFFECTIFS.map(([c, l]) => (
                <button key={c} type="button" className="chip-pick" aria-pressed={codes(data.srcEffectifs ?? "").includes(c)} onClick={() => toggle("srcEffectifs", c)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {key === "offre" && (
        <div className="stack">
          <h2>Que proposez-vous ?</h2>
          <label className="field">
            <span className="label-text">Votre offre en deux phrases</span>
            <textarea className="input" rows={3} value={data.activite ?? ""} onChange={(e) => set("activite", e.target.value)} placeholder="Ex. : logiciel de planning pour le BTP, déployé en 48 h" autoFocus />
          </label>
          <div className="grid2">
            <label className="field">
              <span className="label-text">Objectif de la prospection</span>
              <select className="input" value={data.motifs ?? ""} onChange={(e) => set("motifs", e.target.value)}>
                <option value="">Choisir…</option>
                {MOTIFS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label-text">Prix ou panier moyen (facultatif)</span>
              <input className="input" value={data.prix ?? ""} onChange={(e) => set("prix", e.target.value)} placeholder="Ex. : 290 € / mois" />
            </label>
          </div>
          <label className="field">
            <span className="label-text">Ce qui vous différencie (facultatif)</span>
            <input className="input" value={data.diff ?? ""} onChange={(e) => set("diff", e.target.value)} placeholder="Ex. : seul outil pensé pour les chantiers multi-sites" />
          </label>
        </div>
      )}

      {key === "contacts" && (
        <div className="stack">
          <h2>Qui contacter dans ces entreprises ?</h2>
          <div className="field">
            <span className="label-text">Fonctions visées</span>
            <div className="chips-pick">
              {FONCTIONS.map((f) => <button key={f} type="button" className="chip-pick" aria-pressed={fonctions.includes(f)} onClick={() => toggle("fonctions", f, ", ")}>{f}</button>)}
              {extraFonctions.map((f) => <button key={f} type="button" className="chip-pick" aria-pressed onClick={() => toggle("fonctions", f, ", ")}>{f} ✕</button>)}
            </div>
            <input className="input" placeholder="Autre fonction : tapez-la puis Entrée" onKeyDown={(e) => {
              const v = e.currentTarget.value.trim();
              if (e.key === "Enter" && v) { e.preventDefault(); if (!fonctions.includes(v)) toggle("fonctions", v, ", "); e.currentTarget.value = ""; }
            }} />
          </div>
          <div className="grid2">
            <label className="field">
              <span className="label-text">Prospects par lancement</span>
              <select className="input" value={data.volume ?? "50"} onChange={(e) => set("volume", e.target.value)}>
                {VOLUMES.map((v) => <option key={v} value={v}>{v} entreprises</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label-text">Ton des messages</span>
              <select className="input" value={data.ton ?? TONS[0]} onChange={(e) => set("ton", e.target.value)}>
                {[...new Set([...TONS, data.ton].filter(Boolean))].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
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
            <div><dt>Cible</dt><dd>{ciblageLabel(data) || <span className="enrich">non renseignée</span>} <button type="button" className="btn sm ghost" onClick={() => setStep(1)}>Changer</button></dd></div>
            <div><dt>Offre</dt><dd>{data.activite?.trim() || <span className="enrich">non renseignée</span>}{data.motifs && ` · ${data.motifs}`}</dd></div>
            <div><dt>Contacts</dt><dd>{data.fonctions || "Dirigeant"} · {data.volume ?? "50"} entreprises par lancement · {data.ton}</dd></div>
            {editing && (
              <div><dt>Séquence</dt><dd>
                <select className="input sm" value={tpl} onChange={(e) => setTpl(e.target.value)} aria-label="Séquence">
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </dd></div>
            )}
          </dl>
          <label className="field">
            <span className="label-text">Précisions ou signaux à chercher (facultatif)</span>
            <textarea className="input" rows={2} value={data.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Ex. : entreprises qui recrutent, ouverture d'un nouveau site…" />
          </label>
          {!editing && <p className="hint">La séquence email {aiEnabled ? "est rédigée par l'IA" : "est copiée du modèle standard"} à la création. Rien ne part tout seul : vous lancerez la recherche de prospects, puis la séquence depuis le tableau.</p>}
        </div>
      )}

      {error && <p className="alert error">{error}</p>}
      <div className="row between">
        <div>{step > (editing ? 1 : 0) && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Retour</button>}</div>
        <div className="row">
          {editing && key !== "recap" && <button type="button" className="btn" onClick={submit} disabled={pending}>Enregistrer maintenant</button>}
          {key === "recap" ? (
            <button type="button" className="btn primary" onClick={submit} disabled={pending}>
              {pending ? (aiEnabled && !editing ? "Préparation de la séquence (≈ 30 s)…" : "Enregistrement…") : editing ? "Enregistrer" : "Créer la recherche"}
            </button>
          ) : key !== "depart" ? (
            <button type="button" className="btn primary" onClick={() => setStep(step + 1)}>Suivant</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
