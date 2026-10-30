import Link from "next/link";
import { db } from "@/lib/db";
import { addDays, callBackDue, callQueue, fmtDay, has, isDue, isEmail, todayISO } from "@/lib/prospecting";
import { PhoneLink } from "@/components/call-dock";
import { SendDueButton } from "@/components/mail-buttons";
import { MailError } from "@/lib/mail";
import { syncReplies } from "@/lib/mail-flow";
import { markPhoneEventHandled } from "./parametres/phone-actions";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

type Viewer = { user: { id: string; name: string; signature: string }; membership: { organizationId: string; organization: { phoneProvider: string | null; defaultSignature: string } } };

// Point du jour : la première réponse de l'agent dans le Copilote IA, à chaque ouverture.
export async function Briefing({ user, membership }: Viewer) {
  const orgId = membership.organizationId;
  const today = todayISO();
  const yesterday = addDays(today, -1);
  // Tour de la boîte mail avant tout : les prospects qui ont répondu sortent des relances.
  const account = await db.mailAccount.findUnique({ where: { userId: user.id } });
  let syncError = "";
  if (account) await syncReplies(account, orgId).catch((e) => { syncError = e instanceof MailError ? e.message : "Lecture de la boîte mail impossible pour le moment."; });
  const [prospects, callsYesterday, , replies, missed] = await Promise.all([
    db.prospect.findMany({ where: { organizationId: orgId, status: { notIn: ["Gagné", "Perdu"] } } }),
    db.call.findMany({ where: { organizationId: orgId, userId: user.id, day: yesterday }, select: { issue: true } }),
    db.user.update({ where: { id: user.id }, data: { briefingDay: today } }),
    db.mailMessage.findMany({ where: { organizationId: orgId, direction: "in", at: { gte: daysAgo(3) } }, include: { prospect: { select: { company: true } } }, orderBy: { at: "desc" }, take: 10 }),
    db.phoneEvent.findMany({ where: { organizationId: orgId, handled: false, at: { gte: daysAgo(7) }, OR: [{ userId: user.id }, { userId: null }] }, orderBy: { at: "desc" }, take: 15 }),
  ]);
  const callBacks = prospects.filter((p) => callBackDue(p, today));
  const toCall = callQueue(prospects, today).slice(0, 8);
  const due = prospects.filter((p) => isDue(p, today));
  const ready = prospects.filter((p) => p.status === "À contacter" && p.searchId && !p.seqStoppedAt && isEmail(p.email));
  const replied = prospects.filter((p) => p.status === "A répondu");
  const talks = callsYesterday.filter((c) => c.issue === "Appel").length;
  const target = (p: (typeof prospects)[number]) => ({ id: p.id, company: p.company, contactName: p.contactName, phone: p.phone, status: p.status, angle: p.angle, qualification: p.qualification });
  const hour = Number(new Date().toLocaleString("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }));

  return (
    <div className="briefing">
      <p><b>{hour < 18 ? "Bonjour" : "Bonsoir"} {user.name.split(" ")[0]}, voici votre point du jour.</b> Hier : {callsYesterday.length} appel{callsYesterday.length > 1 ? "s" : ""} dont {talks} conversation{talks > 1 ? "s" : ""}. Aujourd&apos;hui, dans l&apos;ordre :</p>

      <div className="kpis">
        <div className={`kpi${callBacks.length ? " alert" : ""}`}><span className="v">{callBacks.length}</span><span className="k">rappels prévus</span></div>
        <div className={`kpi${replied.length ? " alert" : ""}`}><span className="v">{replied.length}</span><span className="k">prospects qui ont répondu</span></div>
        <div className={`kpi${due.length ? " alert" : ""}`}><span className="v">{due.length}</span><span className="k">relances email à faire</span></div>
        <div className="kpi"><span className="v">{ready.length}</span><span className="k">emails J0 prêts</span></div>
      </div>

      <div className="grid2 top">
        <section className="panel" data-tour="calls" data-tip="Votre file d'appels du jour, dans l'ordre : cliquez sur un numéro pour appeler.">
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
                <div><b>{p.company}</b><span className="muted small block">Relance {(p.relances ?? 0) + 1} · prévue le {fmtDay(p.nextFollowUp)}</span></div>
              </Link>
            ))}
            {ready.length > 0 && <Link className="li" href="/app/prospects?statut=%C3%80%20contacter"><b>{ready.length} premier{ready.length > 1 ? "s" : ""} email{ready.length > 1 ? "s" : ""} J0 à envoyer →</b></Link>}
          </div>
          {account && (due.length > 0 || ready.length > 0) && (
            <div className="row">
              {due.length > 0 && <SendDueButton includeFirst={false} primary label={`Envoyer les ${due.length} relance${due.length > 1 ? "s" : ""}`} />}
              {ready.length > 0 && <SendDueButton includeFirst label={`Envoyer relances + ${ready.length} email${ready.length > 1 ? "s" : ""} J0`} />}
            </div>
          )}
        </section>
      </div>

      <section className="panel" data-tour="inbox">
        <h2>3. Réponses reçues, messagerie vocale, appels manqués</h2>
        {syncError && <p className="alert error">{syncError}</p>}
        {account ? (
          <div className="list">
            {replies.length === 0 && <p className="muted">Aucune réponse de prospect ces 3 derniers jours {account ? ` dans ${account.email}` : ""}.</p>}
            {replies.map((m) => (
              <Link key={m.id} href={`/app/prospects/${m.prospectId}`} className="li">
                <div><b>{m.prospect.company} · {m.subject}</b><span className="muted small block">{m.snippet}</span></div>
                <span className="chip ok">{m.at.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">Connectez votre boîte Gmail ou Outlook dans <Link href="/app/parametres/connecteurs/mailing">Paramètres → Connecteurs</Link> : chaque matin, ce point lira les réponses de vos prospects et vous enverrez vos relances en un clic.</p>
        )}
        {missed.length > 0 && (
          <div className="list">
            {missed.map((e) => {
              const p = prospects.find((x) => x.id === e.prospectId);
              return (
                <div key={e.id} className="li">
                  <div>
                    <b>{e.kind === "voicemail" ? "Message vocal" : "Appel manqué"} · {p?.company ?? e.number}</b>
                    <span className="muted small block">
                      {e.at.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                      {e.transcript ? ` · « ${e.transcript.slice(0, 160)} »` : ""}
                    </span>
                    {e.voicemailUrl && <audio controls preload="none" src={e.voicemailUrl} className="vm" />}
                  </div>
                  <div className="inline">
                    {p ? <PhoneLink p={target(p)} /> : <a className="tel" href={`tel:${e.number.replace(/[^\d+]/g, "")}`}>{e.number}</a>}
                    <form action={markPhoneEventHandled}><input type="hidden" name="id" value={e.id} /><button className="btn sm ghost" type="submit">Traité</button></form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {missed.length === 0 && <p className="hint">Aucun appel manqué ni message vocal en attente{membership.organization.phoneProvider ? "" : " : connectez votre téléphonie dans Paramètres pour les voir ici"}.{has(user.signature) || has(membership.organization.defaultSignature) ? "" : " Pensez aussi à renseigner votre signature dans Paramètres."}</p>}
      </section>
    </div>
  );
}
