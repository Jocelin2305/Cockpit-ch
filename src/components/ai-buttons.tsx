"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateAngles, runSearchAnalysis } from "@/app/app/ai-actions";
import { Markdown } from "./markdown";

const Spark = () => (
  <svg className="spark" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0l1.8 5.2L15 7l-5.2 1.8L8 14l-1.8-5.2L1 7l5.2-1.8z" />
  </svg>
);

// Rédige les angles commerciaux manquants : un prospect, une recherche ou toute l'entreprise.
export function GenerateAnglesButton({
  prospectId, searchId, label = "Générer les angles manquants", className = "btn",
}: { prospectId?: string; searchId?: string; label?: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  return (
    <span className="ai-action">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg({});
            const res = await generateAngles({ prospectId, searchId });
            setMsg(res);
            if (res.ok) router.refresh();
          })
        }
      >
        <Spark />
        {pending ? "Rédaction…" : label}
      </button>
      {msg.error && <span className="ai-msg error" role="alert">{msg.error}</span>}
      {msg.ok && !prospectId && <span className="ai-msg" role="status">{msg.ok}</span>}
    </span>
  );
}

// Ciblage IA et analyse des résultats d'une recherche.
export function SearchAiPanel({ searchId }: { searchId: string }) {
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<"analyse" | "ciblage" | null>(null);
  const [res, setRes] = useState<{ text?: string; error?: string }>({});
  const run = (k: "analyse" | "ciblage") =>
    start(async () => {
      setKind(k);
      setRes({});
      setRes(await runSearchAnalysis(searchId, k));
    });
  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn sm ghost" disabled={pending} onClick={() => run("ciblage")}><Spark />Ciblage IA</button>
        <button type="button" className="btn sm ghost" disabled={pending} onClick={() => run("analyse")}><Spark />Analyser les résultats</button>
      </div>
      {kind && (
        <section className="panel">
          <div className="panel-head">
            <h2>{kind === "analyse" ? "Analyse des résultats" : "Ciblage IA"}</h2>
            {!pending && <button type="button" className="btn sm ghost" onClick={() => { setKind(null); setRes({}); }}>Fermer</button>}
          </div>
          {pending && <p className="muted">{kind === "analyse" ? "Analyse en cours, environ 30 secondes…" : "Ciblage en cours, environ 30 secondes…"}</p>}
          {res.error && <p className="alert error">{res.error}</p>}
          {res.text && <Markdown text={res.text} />}
        </section>
      )}
    </div>
  );
}
