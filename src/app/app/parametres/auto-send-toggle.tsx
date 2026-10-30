"use client";

import { useTransition } from "react";
import { setAutoSend } from "./actions";

// Opt-in de l'envoi automatique des relances, sous la signature.
export function AutoSendToggle({ on, hasMailbox }: { on: boolean; hasMailbox: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div>
      <label className="check">
        <input type="checkbox" defaultChecked={on} disabled={pending || !hasMailbox} onChange={(e) => { const v = e.target.checked; start(() => setAutoSend(v)); }} />
        Envoyer automatiquement mes relances
      </label>
      <p className="muted small">{hasMailbox ? "Chaque matin de semaine, vers 8 h, vos relances dues partent seules depuis votre boîte. Vous lancez toujours vous-même le premier email." : "Connectez d'abord votre boîte mail dans les connecteurs ci-dessous."}</p>
    </div>
  );
}
