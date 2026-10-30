"use client";

import { useState, useTransition } from "react";
import { enrichWithApollo, launchProspectSearch } from "@/app/app/sourcing-actions";

type Res = { ok?: string; error?: string };

function Action({ run, label, pending, primary, tip }: { run: () => Promise<Res>; label: string; pending: string; primary?: boolean; tip: string }) {
  const [res, setRes] = useState<Res>({});
  const [busy, start] = useTransition();
  return (
    <span className="ai-action">
      <button type="button" className={primary ? "btn primary" : "btn"} disabled={busy} onClick={() => start(async () => setRes(await run()))} data-tip={tip}>
        {busy ? pending : label}
      </button>
      {res.error && <span className="ai-msg error">{res.error}</span>}
      {res.ok && <span className="ai-msg">{res.ok}</span>}
    </span>
  );
}

// Trouve de nouvelles entreprises dans le registre (et enrichit les contacts si le service est disponible).
export function LaunchSearchButton({ searchId, first }: { searchId: string; first: boolean }) {
  return (
    <Action
      run={() => launchProspectSearch(searchId)}
      label={first ? "Lancer la recherche de prospects" : "Actualiser : trouver de nouveaux prospects"}
      pending="Recherche en cours…"
      primary
      tip="Cherche de vraies entreprises actives selon vos critères, les ajoute sans doublon et classe les contacts par priorité."
    />
  );
}

export function EnrichButton({ searchId }: { searchId: string | null }) {
  return (
    <Action
      run={() => enrichWithApollo(searchId)}
      label="Enrichir les contacts"
      pending="Enrichissement…"
      tip="Complète l'email, le LinkedIn et le poste des contacts (1 crédit par email trouvé)."
    />
  );
}
