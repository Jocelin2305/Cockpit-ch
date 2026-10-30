import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { CREDIT_COSTS } from "@/lib/credit-grid";
import { db } from "@/lib/db";
import { estimate } from "../overview";
import { adjustCredits } from "./actions";

export const metadata: Metadata = { title: "Crédits et coûts" };

const n = (v: number) => v.toLocaleString("fr-FR");

// Fondateur : solde de chaque portefeuille, et coût réel moyen de chaque action pour ajuster la grille.
export default async function CreditsPage() {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [orgs, resellers, balances, resellerBalances, used, usage] = await Promise.all([
    db.organization.findMany({ where: { resellerId: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.reseller.findMany({ select: { id: true, companyName: true, email: true }, orderBy: { companyName: "asc" } }),
    db.creditEntry.groupBy({ by: ["organizationId"], where: { resellerId: null }, _sum: { delta: true } }),
    db.creditEntry.groupBy({ by: ["resellerId"], where: { resellerId: { not: null } }, _sum: { delta: true } }),
    db.creditEntry.findMany({ where: { kind: "use", createdAt: { gte: since } }, select: { organizationId: true, resellerId: true, delta: true } }),
    db.aiUsage.groupBy({ by: ["feature", "model"], where: { createdAt: { gte: since } }, _sum: { inputTokens: true, outputTokens: true }, _count: true }),
  ]);
  const balance = new Map(balances.map((b) => [b.organizationId, b._sum.delta ?? 0]));
  const resellerBalance = new Map(resellerBalances.map((b) => [b.resellerId, b._sum.delta ?? 0]));
  const usedOf = (test: (u: (typeof used)[number]) => boolean) => 0 - used.filter(test).reduce((s, u) => s + u.delta, 0);
  const wallets = [
    ...resellers.map((r) => ({ key: `r:${r.id}`, name: r.companyName || r.email, type: "Revendeur", balance: resellerBalance.get(r.id) ?? 0, used: usedOf((u) => u.resellerId === r.id) })),
    ...orgs.map((o) => ({ key: `o:${o.id}`, name: o.name, type: "Client direct", balance: balance.get(o.id) ?? 0, used: usedOf((u) => u.organizationId === o.id && !u.resellerId) })),
  ];
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">Fondateur</span>
          <h1>Crédits et coûts</h1>
          <p className="muted">Les soldes de chaque portefeuille et le coût réel de l&apos;IA, pour fixer le prix du crédit à 2 ou 3 fois ce coût.</p>
        </div>
      </header>

      <section className="panel flush">
        <div className="panel-head pad"><h2>Coût réel de l&apos;IA par action (30 jours)</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>Modèle</th><th>Appels</th><th>Coût moyen</th><th>Prix actuel</th></tr></thead>
            <tbody>
              {usage.length === 0 && <tr><td colSpan={5} className="muted">Pas encore d&apos;appel enregistré.</td></tr>}
              {usage.map((u) => (
                <tr key={`${u.feature}-${u.model}`}>
                  <td>{u.feature}</td>
                  <td className="muted">{u.model}</td>
                  <td className="num">{n(u._count)}</td>
                  <td className="num">≈ {(estimate(u.model, u._sum.inputTokens ?? 0, u._sum.outputTokens ?? 0) / Math.max(1, u._count)).toFixed(4)} $</td>
                  <td className="num">{CREDIT_COSTS[u.feature] ?? 1} crédit{(CREDIT_COSTS[u.feature] ?? 1) > 1 ? "s" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel flush">
        <div className="panel-head pad"><h2>Portefeuilles</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>Type</th><th>Solde</th><th>Utilisés (30 jours)</th><th>Ajouter ou retirer</th></tr></thead>
            <tbody>
              {wallets.map((w) => (
                <tr key={w.key}>
                  <td><b>{w.name}</b></td>
                  <td className="muted">{w.type}</td>
                  <td className="num">{n(w.balance)}</td>
                  <td className="num">{n(w.used)}</td>
                  <td>
                    <form action={adjustCredits} className="inline">
                      <input type="hidden" name="wallet" value={w.key} />
                      <input className="input sm" name="amount" type="number" placeholder="+100" aria-label="Crédits à ajouter ou retirer" style={{ width: 90 }} required />
                      <input className="input sm" name="label" placeholder="Motif" aria-label="Motif" />
                      <button className="btn sm" type="submit">Valider</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
