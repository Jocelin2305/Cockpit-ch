import Link from "next/link";
import { CREDIT_COSTS, CREDIT_LABELS } from "@/lib/credit-grid";
import { creditBalance, usedLastMonth } from "@/lib/credits";
import { db } from "@/lib/db";

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const n = (v: number) => v.toLocaleString("fr-FR");

// Crédits de l'entreprise : solde, grille et derniers mouvements. Le client d'un revendeur ne voit que sa consommation.
export async function CreditsPanel({ org, support }: { org: { id: string; resellerId: string | null }; support: string }) {
  const [balance, used, entries] = await Promise.all([
    org.resellerId ? null : creditBalance(org),
    usedLastMonth(org.id),
    db.creditEntry.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  return (
    <section className="panel" id="credits">
      <div className="panel-head">
        <h2>Crédits</h2>
        {!org.resellerId && <Link className="btn sm" href="/abonnement">Recharger</Link>}
      </div>
      <p>
        {balance !== null && <><b>{n(balance)} crédits disponibles</b> · </>}
        {n(used)} utilisés sur 30 jours
      </p>
      {org.resellerId && <p className="muted small">Votre conseiller gère vos crédits : <a href={`mailto:${support}`}>{support}</a></p>}
      <details>
        <summary className="muted small">Prix de chaque action</summary>
        <ul className="list">
          {Object.entries(CREDIT_COSTS).map(([k, v]) => <li key={k} className="row between"><span>{CREDIT_LABELS[k]}{k === "angles" && " (par prospect)"}{(k === "email" || k === "phone") && " (seulement si trouvé)"}</span><span className="mono">{v}</span></li>)}
        </ul>
      </details>
      {entries.length > 0 && (
        <details>
          <summary className="muted small">Derniers mouvements</summary>
          <ul className="list">
            {entries.map((e) => <li key={e.id} className="row between"><span>{e.label} <span className="muted small">{fmt(e.createdAt)}</span></span><span className="mono">{e.delta > 0 ? "+" : ""}{n(e.delta)}</span></li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
