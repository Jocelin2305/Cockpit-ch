import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { addDays, callBackDue, callQueue, fmtDay, has, isDue, isEmail, todayISO } from "@/lib/prospecting";
import { PhoneLink } from "@/components/call-dock";

export const metadata: Metadata = { title: "Point du jour" };

// Point complet du quotidien du commercial, affiché à chaque connexion et chaque matin.
export default async function BriefingPage() {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const [prospects, callsYesterday] = await Promise.all([
    db.prospect.findMany({ where: { organizationId: orgId, status: { notIn: ["Gagné", "Perdu"] } } }),
    db.call.findMany({ where: { organizationId: orgId, userId: user.id, day: yesterday }, select: { issue: true } }),
    db.user.update({ where: { id: user.id }, data: { briefingDay: today } }),
  ]);
  const callBacks = prospects.filter((p) => callBackDue(p, today));
  const toCall = callQueue(prospects, today).slice(0, 8);
  const due = prospects.filter((p) => isDue(p, today));
  const ready = prospects.filter((p) => p.status === "À contacter" && p.searchId && isEmail(p.email));
  const replied = prospects.filter((p) => p.status === "A répondu");
  const talks = callsYesterday.filter((c) => c.issue === "Appel").length;
  const target = (p: (typeof prospects)[number]) => ({ id: p.id, company: p.company, contactName: p.contactName, phone: p.phone, status: p.status, angle: p.angle, qualification: p.qualification });
  const hour = Number(new Date().toLocaleString("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }));

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" })}</span>
          <h1>{hour < 18 ? "Bonjour" : "Bonsoir"} {user.name.split(" ")[0]}, voici votre journée</h1>
          <p className="muted">Hier : {callsYesterday.length} appel{callsYesterday.length > 1 ? "s" : ""} dont {talks} conversation{talks > 1 ? "s" : ""}. Aujourd&apos;hui, dans l&apos;ordre :</p>
        </div>
        <Link className="btn primary" href="/app/tableau-de-bord">C&apos;est parti →</Link>
      </header>

      <div className="kpis">
        <div className={`kpi${callBacks.length ? " alert" : ""}`}><span className="v">{callBacks.length}</span><span className="k">rappels prévus</span></div>
        <div className={`kpi${replied.length ? " alert" : ""}`}><span className="v">{replied.length}</span><span className="k">prospects qui ont répondu</span></div>
        <div className={`kpi${due.length ? " alert" : ""}`}><span className="v">{due.length}</span><span className="k">relances email à faire</span></div>
        <div className="kpi"><span className="v">{ready.length}</span><span className="k">emails J0 prêts</span></div>
      </div>

      <div className="grid2 top">
        <section className="panel" data-tip="Votre file d'appels du jour, dans l'ordre : cliquez sur un numéro pour appeler.">
          <h2>1. Appels à passer</h2>
          <div className="list">
            {toCall.length === 0 && <p className="muted">Aucun appel prévu. Ajoutez des numéros directs à vos prospects.</p>}
            {toCall.map((p) => (
              <div key={p.id} className="li">
                <div><Link href={`/app/prospects/${p.id}`}><b>{p.company}</b></Link><span className="muted small block">{callBackDue(p, today) ? `Rappel prévu · ${p.status}` : p.status}</span></div>
                <PhoneLink p={target(p)} />
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>2. Emails à relancer</h2>
          <div className="list">
            {due.length === 0 && <p className="muted">Aucune relance due aujourd&apos;hui.</p>}
            {due.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/app/prospects/${p.id}`} className="li">
                <div><b>{p.company}</b><span className="muted small block">Relance {(p.relances ?? 0) + 1}/5 · prévue le {fmtDay(p.nextFollowUp)}</span></div>
              </Link>
            ))}
            {ready.length > 0 && <Link className="li" href="/app/prospects?statut=%C3%80%20contacter"><b>{ready.length} premier{ready.length > 1 ? "s" : ""} email{ready.length > 1 ? "s" : ""} J0 à envoyer →</b></Link>}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>3. Boîte mail, messagerie vocale, appels manqués</h2>
        <p className="muted">
          Dès que votre messagerie (Gmail ou Outlook) et votre téléphonie seront connectées, ce point récupérera chaque matin vos nouveaux emails de prospects,
          vos messages vocaux et vos appels manqués{has(user.signature) ? "" : " ; pensez aussi à renseigner votre signature dans Paramètres"}.
        </p>
      </section>
    </div>
  );
}
