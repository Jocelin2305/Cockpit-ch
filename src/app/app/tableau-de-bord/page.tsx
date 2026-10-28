import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { addDays, callQueue, dueState, fmtDay, has, isDue, isEmail, stats, todayISO } from "@/lib/prospecting";
import { Kpis } from "@/components/kpis";
import { GenerateAnglesButton } from "@/components/ai-buttons";

export const metadata: Metadata = { title: "Tableau de bord" };

const Rate = ({ v }: { v: number }) => (
  <div className="gauge"><div className="g"><i style={{ width: `${v}%` }} /></div><span className="num">{v}%</span></div>
);

export default async function DashboardPage() {
  const { user, membership } = await requireMember();
  const isAdmin = membership.role === ROLES.ADMIN;
  const orgId = membership.organizationId;
  const since = addDays(todayISO(), -29);
  const [prospects, searches, calls, members] = await Promise.all([
    db.prospect.findMany({ where: { organizationId: orgId } }),
    db.search.findMany({ where: { organizationId: orgId }, include: { template: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    db.call.findMany({ where: { organizationId: orgId, day: { gte: since } }, select: { userId: true, day: true, issue: true, durationMs: true } }),
    isAdmin ? db.membership.findMany({ where: { organizationId: orgId }, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
  ]);
  const today = todayISO();
  const st = stats(prospects, today);
  const due = prospects.filter((p) => isDue(p, today)).sort((a, b) => (a.nextFollowUp ?? "").localeCompare(b.nextFollowUp ?? ""));
  const ready = prospects.filter((p) => p.status === "À contacter" && p.searchId && isEmail(p.email));
  const noAngle = prospects.filter((p) => !has(p.angle) && !["Gagné", "Perdu"].includes(p.status));
  const noEmail = prospects.filter((p) => p.status === "À contacter" && !isEmail(p.email));
  const top = prospects.filter((p) => p.priority === "A" && p.status === "À contacter").slice(0, 6);

  const toCall = callQueue(prospects, today);
  const steps = [
    { v: toCall.length, t: "Appels à passer", d: "File triée : rappels prévus, prospects qui ont répondu, puis relancés par email.", href: "/app", b: "Voir les appels" },
    { v: due.length, t: "Relances dues", d: "Ouvrez chaque fiche : le texte de la relance est prêt à copier.", href: "/app/prospects?dues=1", b: "Voir les relances" },
    { v: ready.length, t: "Emails J0 prêts", d: "Prospects « À contacter » avec email et séquence.", href: "/app/prospects?statut=%C3%80%20contacter", b: "Voir la liste" },
    { v: noAngle.length, t: "Angles à rédiger", d: "L'angle commercial de chaque prospect, pour savoir quoi dire avant de contacter.", href: "", b: "Générer" },
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
                {s.v > 0 && (s.href
                  ? <Link className={`btn sm${i === hot ? " primary" : ""}`} href={s.href}>{s.b}</Link>
                  : <GenerateAnglesButton label={s.b} className={`btn sm${i === hot ? " primary" : ""}`} />)}
              </div>
            ))}
          </div>
        </section>
      )}

      <Kpis st={st} />

      <CallStats calls={calls} userId={user.id} members={members.map((m) => m.user)} today={today} />

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
                <div><b>{p.company}</b><span className="muted small block">{p.contactRole} · relance {(p.relances ?? 0) + 1}</span></div>
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

type CallRow = { userId: string | null; day: string; issue: string; durationMs: number };

// Appels, conversations (appel avec compte rendu) et temps passé, par période.
function callStats(calls: CallRow[], from: string) {
  const list = calls.filter((c) => c.day >= from);
  const talks = list.filter((c) => c.issue === "Appel").length;
  const min = Math.round(list.reduce((s, c) => s + c.durationMs, 0) / 60000);
  return { n: list.length, talks, min, rate: list.length ? Math.round((talks / list.length) * 100) : 0 };
}

function CallStats({ calls, userId, members, today }: { calls: CallRow[]; userId: string; members: { id: string; name: string }[]; today: string }) {
  const mine = calls.filter((c) => c.userId === userId);
  const periods = [
    { t: "Aujourd'hui", from: today },
    { t: "7 jours", from: addDays(today, -6) },
    { t: "30 jours", from: addDays(today, -29) },
  ];
  const week = addDays(today, -6);
  return (
    <section className="panel flush" data-tour="stats" data-tip="Vos appels : nombre, conversations réelles (avec compte rendu) et temps passé au téléphone.">
      <div className="panel-head pad"><h2>Stats d&apos;appels</h2></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{members.length ? "Commercial" : "Période"}</th>{members.length ? <><th>Appels (7 j)</th><th>Conversations (7 j)</th><th>Taux de joignabilité</th><th>Temps au téléphone (7 j)</th><th>Appels (30 j)</th></> : <><th>Appels</th><th>Conversations</th><th>Taux de joignabilité</th><th>Temps au téléphone</th></>}</tr></thead>
          <tbody>
            {members.length
              ? members.map((m) => {
                  const own = calls.filter((c) => c.userId === m.id);
                  const w = callStats(own, week);
                  return (
                    <tr key={m.id}>
                      <td><b>{m.name}</b>{m.id === userId && <span className="chip">vous</span>}</td>
                      <td className="num">{w.n}</td><td className="num">{w.talks}</td><td><Rate v={w.rate} /></td><td className="num">{w.min} min</td>
                      <td className="num">{callStats(own, addDays(today, -29)).n}</td>
                    </tr>
                  );
                })
              : periods.map((p) => {
                  const s = callStats(mine, p.from);
                  return (
                    <tr key={p.t}><td><b>{p.t}</b></td><td className="num">{s.n}</td><td className="num">{s.talks}</td><td><Rate v={s.rate} /></td><td className="num">{s.min} min</td></tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
