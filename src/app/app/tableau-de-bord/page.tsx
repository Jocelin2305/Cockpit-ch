import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { dueState, fmtDay, has, isDue, isEmail, stats, todayISO } from "@/lib/prospecting";
import { Kpis } from "@/components/kpis";

export const metadata: Metadata = { title: "Tableau de bord" };

const Rate = ({ v }: { v: number }) => (
  <div className="gauge"><div className="g"><i style={{ width: `${v}%` }} /></div><span className="num">{v}%</span></div>
);

export default async function DashboardPage() {
  const { membership } = await requireMember();
  const orgId = membership.organizationId;
  const [prospects, searches] = await Promise.all([
    db.prospect.findMany({ where: { organizationId: orgId } }),
    db.search.findMany({ where: { organizationId: orgId }, include: { template: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const today = todayISO();
  const st = stats(prospects, today);
  const due = prospects.filter((p) => isDue(p, today)).sort((a, b) => (a.nextFollowUp ?? "").localeCompare(b.nextFollowUp ?? ""));
  const ready = prospects.filter((p) => p.status === "À contacter" && p.searchId && isEmail(p.email));
  const noAngle = prospects.filter((p) => !has(p.angle) && !["Gagné", "Perdu"].includes(p.status));
  const noEmail = prospects.filter((p) => p.status === "À contacter" && !isEmail(p.email));
  const top = prospects.filter((p) => p.priority === "A" && p.status === "À contacter").slice(0, 6);

  const steps = [
    { v: due.length, t: "Relances dues", d: "Ouvrez chaque fiche : le texte de la relance est prêt à copier.", href: "/app/prospects?dues=1", b: "Voir les relances" },
    { v: ready.length, t: "Emails J0 prêts", d: "Prospects « À contacter » avec email et séquence.", href: "/app/prospects?statut=%C3%80%20contacter", b: "Voir la liste" },
    { v: noAngle.length, t: "Angles à rédiger", d: "La génération automatique arrive avec l'assistant IA.", href: "/app/prospects", b: "Voir les prospects" },
    { v: noEmail.length, t: "Emails à trouver", d: "Prospects à contacter sans email direct : à enrichir.", href: "/app/prospects?statut=%C3%80%20contacter", b: "Voir la liste" },
  ];
  const hot = steps.findIndex((s) => s.v > 0);

  const groups = [
    ...searches.map((s) => ({ id: s.id, name: s.name, tpl: s.template?.name, list: prospects.filter((p) => p.searchId === s.id) })),
    ...(prospects.some((p) => !p.searchId) ? [{ id: "", name: "Sans recherche", tpl: undefined, list: prospects.filter((p) => !p.searchId) }] : []),
  ];

  return (
    <div className="view wide">
      <header className="view-head">
        <div><h1>Tableau de bord</h1><p className="muted">Votre pipeline, de l&apos;identification au rendez-vous.</p></div>
        <div className="row">
          {membership.role === ROLES.ADMIN && <Link className="btn" href="/app/recherches/nouvelle">+ Nouvelle recherche</Link>}
          <Link className="btn primary" href="/app/prospects/nouveau">+ Ajouter un prospect</Link>
        </div>
      </header>

      {searches.length === 0 && prospects.length === 0 ? (
        <section className="cta">
          <div><h2>Créez votre première recherche</h2><p className="muted">Le questionnaire vous guide en 2 minutes et prépare la séquence emails + LinkedIn.</p></div>
          {membership.role === ROLES.ADMIN
            ? <Link className="btn primary" href="/app/recherches/nouvelle">+ Créer une recherche</Link>
            : <p className="muted small">Demandez à un administrateur de créer une recherche.</p>}
        </section>
      ) : (
        <section className="panel">
          <div className="panel-head">
            <h2>Plan du jour</h2>
            <span className="label">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" })}</span>
          </div>
          <div className="plan">
            {steps.map((s, i) => (
              <div key={s.t} className={`pstep${i === hot ? " hot" : ""}`}>
                <span className="v">{s.v}</span><b>{s.t}</b><p>{s.d}</p>
                {s.v > 0 && <Link className={`btn sm${i === hot ? " primary" : ""}`} href={s.href}>{s.b}</Link>}
              </div>
            ))}
          </div>
        </section>
      )}

      <Kpis st={st} />

      {groups.length > 0 && (
        <section className="panel flush">
          <div className="panel-head pad"><h2>Vos recherches</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Recherche</th><th>Prospects</th><th>Contactés</th><th>Réponse</th><th>RDV</th><th>Conversion</th><th>Gagnés</th><th>Relances dues</th></tr></thead>
              <tbody>
                {groups.map((g) => {
                  const s = stats(g.list, today);
                  return (
                    <tr key={g.id || "none"}>
                      <td>{g.id ? <Link href={`/app/recherches/${g.id}`}><b>{g.name}</b></Link> : <b>{g.name}</b>}{g.tpl && <span className="muted small block">{g.tpl}</span>}</td>
                      <td className="num">{s.n}</td><td className="num">{s.contacted}</td>
                      <td><Rate v={s.rReply} /></td><td><Rate v={s.rRdv} /></td><td><Rate v={s.rConv} /></td>
                      <td className="num">{s.won}</td>
                      <td>{s.due ? <span className={`chip ${s.late ? "late" : "today"}`}>{s.due}</span> : <span className="muted">0</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid2 top">
        <section className="panel">
          <h2>Relances à faire</h2>
          <div className="list">
            {due.length === 0 && <p className="muted">Aucune relance due aujourd&apos;hui. Elles se programment seules quand un prospect passe en « Contacté ».</p>}
            {due.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/app/prospects/${p.id}`} className="li">
                <div><b>{p.company}</b><span className="muted small block">{p.contactRole} · relance {(p.relances ?? 0) + 1}/5</span></div>
                <span className={`chip ${dueState(p, today) === "late" ? "late" : "today"}`}>{dueState(p, today) === "late" ? `En retard · ${fmtDay(p.nextFollowUp)}` : "Aujourd'hui"}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Priorités à contacter</h2>
          <div className="list">
            {top.length === 0 && <p className="muted">Aucun prospect prioritaire en attente.</p>}
            {top.map((p) => (
              <Link key={p.id} href={`/app/prospects/${p.id}`} className="li">
                <div><b>{p.company}</b><span className="muted small block">{has(p.angle) ? p.angle : has(p.qualification) ? p.qualification : "Angle à rédiger"}</span></div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
