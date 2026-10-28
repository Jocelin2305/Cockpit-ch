"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { parseCSV, rowsToProspects } from "@/lib/prospecting";
import { importProspects } from "../actions";

export function ImportForm({ searches, defaultSearch }: { searches: { id: string; name: string }[]; defaultSearch: string }) {
  const [text, setText] = useState("");
  const [searchId, setSearchId] = useState(defaultSearch);
  const [result, setResult] = useState<{ count: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const preview = text.trim() ? rowsToProspects(parseCSV(text)) : [];

  return (
    <div className="panel stack">
      <label className="field">
        <span className="label-text">Ranger dans la recherche</span>
        <select className="input" value={searchId} onChange={(e) => setSearchId(e.target.value)}>
          <option value="">Aucune</option>
          {searches.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="label-text">Fichier CSV</span>
        <input
          className="input"
          type="file"
          accept=".csv,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => { setText(String(r.result ?? "")); setResult(null); };
            r.readAsText(f);
          }}
        />
      </label>
      <label className="field">
        <span className="label-text">… ou collez le contenu</span>
        <textarea className="input mono" rows={8} value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder="Entreprise;Secteur;Ville;Taille;Interlocuteur;Fonction;…" />
      </label>
      {text.trim() && <p className="hint">{preview.length} prospect{preview.length > 1 ? "s" : ""} reconnu{preview.length > 1 ? "s" : ""} (une colonne « Entreprise » est obligatoire).</p>}
      {error && <p className="alert error">{error}</p>}
      {result && (
        <p className="alert ok">
          {result.count} prospect{result.count > 1 ? "s" : ""} importé{result.count > 1 ? "s" : ""}
          {result.skipped ? `, ${result.skipped} ligne(s) ignorée(s) sans nom d'entreprise` : ""}.{" "}
          <Link href={searchId ? `/app/recherches/${searchId}` : "/app/prospects"}>Voir les prospects</Link>
        </p>
      )}
      <div className="row">
        <button
          type="button"
          className="btn primary"
          disabled={!preview.length || pending}
          onClick={() => {
            setError("");
            start(async () => {
              try { setResult(await importProspects(searchId || null, preview)); setText(""); }
              catch { setError("L'import a échoué. Vérifiez le fichier et réessayez."); }
            });
          }}
        >
          {pending ? "Import…" : `Importer ${preview.length || ""} prospect${preview.length > 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
