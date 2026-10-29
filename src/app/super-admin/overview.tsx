import Link from "next/link";
import { db } from "@/lib/db";
import { isSuperAdminEmail, requireAdminSpace, ROLES } from "@/lib/auth";
import { accessState } from "@/lib/billing";
import { planById } from "@/lib/plans";
import { enterOrganization, setSuperAdmin } from "./actions";
import { ClientForm } from "./client-form";
import { cleanupDemos, DEMO_DOMAIN } from "@/lib/demo";

export type Section = "pilotage" | "clients" | "utilisateurs";

const TITLES: Record<Section, { title: string; reseller: string; text: string; resellerText: string }> = {
  pilotage: { title: "Vue d'ensemble", reseller: "Vue d'ensemble", text: "Revenus, abonnements, démos et coûts de l'IA, toutes entreprises confondues.", resellerText: "L'activité des entreprises que vous avez apportées." },
  clients: { title: "Entreprises clientes", reseller: "Mes clients", text: "Onboardez un nouveau client et ouvrez l'espace de chaque entreprise pour le paramétrer.", resellerText: "Onboardez vos clients, paramétrez leur espace, suivez leur abonnement." },
  utilisateurs: { title: "Utilisateurs", reseller: "Utilisateurs", text: "Les derniers inscrits et les droits super admin.", resellerText: "Les derniers inscrits chez vos clients." },
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "jamais");

// Revendeur (resellerId) : uniquement ses clients ; ni démos ni coûts IA.
async function loadOverview(resellerId: string | null) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  // Les visiteurs de la démo ne comptent pas comme utilisateurs.
  const real = { NOT: { email: { endsWith: `@${DEMO_DOMAIN}` } }, ...(resellerId ? { memberships: { some: { organization: { resellerId } } } } : {}) };
  const sinceMonth = new Date(Date.now() - 30 * 86_400_000);
  return Promise.all([
    db.organization.findMany({
      where: { isDemo: false, ...(resellerId ? { resellerId } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true } },
        memberships: { where: { role: ROLES.ADMIN }, include: { user: true }, orderBy: { createdAt: "asc" }, take: 1 },
        reseller: { select: { companyName: true, email: true } },
      },
    }),
    db.user.count({ where: real }),
    db.user.count({ where: { ...real, createdAt: { gte: weekAgo } } }),
    db.user.count({ where: { ...real, lastLoginAt: { gte: weekAgo } } }),
    db.user.findMany({ where: real, orderBy: { createdAt: "desc" }, take: 10, include: { memberships: { include: { organization: true } } } }),
    resellerId ? [] : db.demoVisit.findMany({ where: { createdAt: { gte: sinceMonth } }, select: { createdAt: true, convertedAt: true, source: true } }),
    resellerId ? [] : db.aiUsage.groupBy({ by: ["organizationId"], where: { createdAt: { gte: sinceMonth } }, _sum: { inputTokens: true, outputTokens: true } }),
  ]);
}

// Estimation au tarif public de Claude Opus 5.5 (4 $ / 20 $ par million de jetons), hors réductions du cache.
const estimate = (input: number, output: number) => (input * 4 + output * 20) / 1_000_000;
const fmtTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n >= 1000 ? `${Math.round(n / 1000)} k` : String(n));

// Espace super admin, une rubrique par page du menu.
export async function Overview({ section }: { section: Section }) {
  const { user: me, resellerId } = await requireAdminSpace();
  if (!resellerId) await cleanupDemos().catch(() => 0);
  const [organizations, userCount, newUsers, activeUsers, recentUsers, demos, aiByOrg] = await loadOverview(resellerId);
  const demosWeek = demos.filter((d) => d.createdAt > daysAgo(7)).length;
  const converted = demos.filter((d) => d.convertedAt).length;
  const sources = Object.entries(demos.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.source || "lien direct"]: (acc[d.source || "lien direct"] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const ai = new Map(aiByOrg.map((r) => [r.organizationId, { i: r._sum.inputTokens ?? 0, o: r._sum.outputTokens ?? 0 }]));
  const aiTotal = [...ai.values()].reduce((s, v) => s + estimate(v.i, v.o), 0);
  const states = new Map(organizations.map((o) => [o.id, accessState(o)]));
  // Les espaces offerts aux revendeurs ne sont ni payants ni en essai.
  const paying = organizations.filter((o) => !o.isPartner && ["active", "past_due"].includes(states.get(o.id)!.kind));
  const mrr = paying.reduce((s, o) => s + (planById(o.plan)?.price ?? 0), 0);
  const trials = organizations.filter((o) => states.get(o.id)!.kind === "trial").length;
  const statusLabel = (id: string) => {
    const st = states.get(id)!;
    return st.kind === "trial" ? `Essai · ${st.daysLeft} j` : st.kind === "active" ? `${st.planName}${st.cancelAtPeriodEnd ? " (résilié)" : ""}` : st.kind === "past_due" ? `${st.planName} · impayé` : st.reason === "trial_over" ? "Essai terminé" : st.reason === "unpaid" ? "Suspendu" : "Résilié";
  };

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">{resellerId ? "Super admin revendeur" : me.isFounder ? "Fondateur" : "Super admin"}</span>
          <h1>{resellerId ? TITLES[section].reseller : TITLES[section].title}</h1>
          <p className="muted">{resellerId ? TITLES[section].resellerText : TITLES[section].text}</p>
        </div>
      </header>

      {section === "pilotage" && <>
      <div className="kpis">
        <div className="kpi"><span className="v">{organizations.length}</span><span className="k">entreprises</span></div>
        <div className="kpi"><span className="v">{userCount}</span><span className="k">utilisateurs</span></div>
        <div className="kpi"><span className="v">{newUsers}</span><span className="k">nouveaux (7 jours)</span></div>
        <div className="kpi"><span className="v">{activeUsers}</span><span className="k">actifs (7 jours)</span></div>
      </div>
      <div className="kpis">
        <div className="kpi win"><span className="v">{mrr} €</span><span className="k">revenu mensuel récurrent (HT)</span></div>
        <div className="kpi"><span className="v">{paying.length}</span><span className="k">entreprises payantes</span></div>
        <div className="kpi"><span className="v">{trials}</span><span className="k">en essai gratuit</span></div>
        <div className="kpi"><span className="v">{organizations.filter((o) => !o.isPartner).length - paying.length - trials}</span><span className="k">essai terminé ou résilié</span></div>
      </div>
      {!resellerId && <div className="kpis">
        <div className="kpi"><span className="v">{demosWeek}</span><span className="k">démos ouvertes (7 jours)</span></div>
        <div className="kpi"><span className="v">{demos.length}</span><span className="k">démos ouvertes (30 jours)</span></div>
        <div className="kpi win"><span className="v">{converted}</span><span className="k">démos converties en espace (30 jours)</span></div>
        <div className="kpi"><span className="v">{demos.length ? Math.round((converted / demos.length) * 100) : 0} %</span><span className="k">taux de conversion</span></div>
      </div>}
      {sources.length > 0 && <p className="muted small">Provenance des démos (30 jours) : {sources.map(([s, n]) => `${s} (${n})`).join(" · ")}.</p>}
      {!resellerId && <p className="muted small">Coût IA estimé sur 30 jours, toutes entreprises : ≈ {aiTotal.toFixed(2)} $ (tarif public Claude Opus 5.5, hors réductions du cache).</p>}
      </>}

      {section === "clients" && <>
      <section className="panel">
        <h2>Onboarder un nouveau client</h2>
        <p className="muted small">Créez son compte (essai gratuit), paramétrez ses recherches, séquences et prospects, puis envoyez le lien à son administrateur : tout sera prêt à sa première connexion.</p>
        <ClientForm />
      </section>

      <section className="panel flush">
        <div className="panel-head pad"><h2>Entreprises clientes</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Entreprise</th><th>Administrateur</th><th>Membres</th><th>Abonnement</th>{!resellerId && <th>Revendeur</th>}{!resellerId && <th>IA (30 jours)</th>}<th>Créée le</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {organizations.length === 0 && (
                <tr><td colSpan={8} className="muted">Aucune entreprise pour l&apos;instant.</td></tr>
              )}
              {organizations.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.name}</b></td>
                  <td>{o.memberships[0]?.user.email ?? <span className="muted">aucun</span>}</td>
                  <td className="num">{o._count.memberships}</td>
                  <td><span className={`chip ${["active", "past_due"].includes(states.get(o.id)!.kind) ? "ok" : states.get(o.id)!.kind === "blocked" ? "late" : ""}`}>{statusLabel(o.id)}</span></td>
                  {!resellerId && <td>{o.isPartner ? <span className="chip">espace offert</span> : o.reseller ? o.reseller.companyName || o.reseller.email : <span className="muted">direct</span>}</td>}
                  {!resellerId && <td className="num">{(() => { const u = ai.get(o.id); return u ? `${fmtTokens(u.i + u.o)} jetons · ≈ ${estimate(u.i, u.o).toFixed(2)} $` : <span className="muted">—</span>; })()}</td>}
                  <td className="muted">{fmt(o.createdAt)}</td>
                  <td><div className="inline"><form action={enterOrganization}><input type="hidden" name="id" value={o.id} /><button className="btn sm primary" type="submit">Paramétrer</button></form><Link className="btn sm" href={`/super-admin/entreprises/${o.id}`}>Détail</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </>}

      {section === "utilisateurs" && <section className="panel flush">
        <div className="panel-head pad"><h2>Derniers inscrits</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th>Email</th><th>Entreprise</th><th>Inscrit le</th><th>Dernière connexion</th>{me.isFounder && <th>Super admin</th>}</tr></thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b>{u.isSuperAdmin && <span className="chip ok">super admin</span>}</td>
                  <td>{u.email}</td>
                  <td>{u.memberships.map((m) => m.organization.name).join(", ") || <span className="muted">aucune</span>}</td>
                  <td className="muted">{fmt(u.createdAt)}</td>
                  <td className="muted">{fmt(u.lastLoginAt)}</td>
                  {me.isFounder && (
                    <td>{isSuperAdminEmail(u.email) ? <span className="muted small">fondateur</span> : (
                      <form action={setSuperAdmin}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="on" value={u.isSuperAdmin ? "0" : "1"} /><button className="btn sm" type="submit">{u.isSuperAdmin ? "Retirer" : "Accorder"}</button></form>
                    )}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}
    </div>
  );
}
