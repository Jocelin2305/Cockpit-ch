import { effectiveSignature } from "@/lib/prospecting";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { ConfirmButton, SubmitButton } from "@/components/forms";
import { StatusSelect } from "@/components/status-select";
import {
  canRelance, completeness, dueState, fmtDay, has, qualScore, seqSteps, stepDay, stepText, tplDelays, tplLiDelays, type Qualif,
} from "@/lib/prospecting";
import { ProspectForm } from "../prospect-form";
import { deleteProspect, markStepDone } from "../actions";
import { QualifCard } from "./qualif-card";
import { SequenceEditor } from "./sequence-editor";
import { CopyBlock } from "./copy-block";
import { GenerateAnglesButton } from "@/components/ai-buttons";
import { PhoneLink } from "@/components/call-dock";
import { SendEmailButton } from "@/components/mail-buttons";
import { PrioritySelect } from "@/components/prospect-cells";

export const metadata: Metadata = { title: "Fiche prospect" };

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const { id } = await params;
  const [p, searches, account] = await Promise.all([
    db.prospect.findFirst({
      where: { id, organizationId: orgId },
      include: { search: { include: { template: true } }, calls: { orderBy: { createdAt: "desc" } }, mails: { orderBy: { at: "desc" }, take: 20 } },
    }),
    db.search.findMany({ where: { organizationId: orgId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.mailAccount.findUnique({ where: { userId: user.id }, select: { email: true } }),
  ]);
  if (!p) notFound();

  const template = p.search?.template ?? null;
  const delays = tplDelays(template?.delays);
  const liDelays = tplLiDelays(template?.liDelays);
  const steps = seqSteps(delays, liDelays);
  const signature = effectiveSignature(user, membership.organization);
  const status = p.status ?? "À contacter";
  const due = dueState(p);

  // Prochaine étape email : J0 si jamais contacté, sinon la relance suivante.
  const nextKey = status === "À contacter" ? "email" : canRelance(p, delays.length) ? `relance${(p.relances ?? 0) + 1}` : null;
  const nextStep = steps.find((s) => s.k === nextKey);
  const next = nextStep ? stepText(nextStep.k, nextStep.subj, p, template?.steps, signature) : null;

  // Textes de toutes les étapes, pour l'éditeur de séquence personnalisée.
  const own = (p.sequence ?? {}) as Record<string, string>;
  const resolved = Object.fromEntries(
    steps.flatMap((s) => {
      const t = stepText(s.k, s.subj, { ...p, sequence: {} }, template?.steps, signature);
      return [[s.k, own[s.k] ?? t.body], ...(s.subj ? [[s.subj, own[s.subj] ?? t.subject]] : [])];
    }),
  ) as Record<string, string>;
  const days = Object.fromEntries(steps.map((s) => [s.k, stepDay(s, delays, liDelays)]));

  const initial = { ...p, searchId: p.searchId ?? "" } as unknown as Record<string, string>;
  const c = completeness(p);
  const q = qualScore(p.qualif);

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <Link href={p.searchId ? `/app/recherches/${p.searchId}` : "/app/prospects"} className="small">
            ← {p.search?.name ?? "Tableau de suivi"}
          </Link>
          <h1>{p.company}</h1>
          <p className="muted">
            {[has(p.contactName) ? p.contactName : null, p.contactRole, p.city].filter(Boolean).join(" · ") || "Interlocuteur à enrichir"}
          </p>
          <div className="row tight">
            {has(p.phone) && <PhoneLink className="btn sm primary" p={{ id: p.id, company: p.company, contactName: p.contactName, phone: p.phone, status: p.status, angle: p.angle, qualification: p.qualification }} />}
            <PrioritySelect id={p.id} priority={p.priority} />
            <span className="chip">Fiche {c} %</span>
            {q !== null && <span className="chip ok">Qualification {q} %</span>}
            {p.nextFollowUp && <span className={`chip ${due === "late" ? "late" : due === "today" ? "today" : ""}`}>Relance le {fmtDay(p.nextFollowUp)}</span>}
          </div>
        </div>
        <div className="row">
          <StatusSelect id={p.id} status={status} label={p.company} />
          {membership.role === ROLES.ADMIN && (
            <form action={deleteProspect}>
              <input type="hidden" name="id" value={p.id} />
              <ConfirmButton confirm="Confirmer la suppression">Supprimer</ConfirmButton>
            </form>
          )}
        </div>
      </header>

      <section className="angle-box">
        <span className="label">Angle commercial</span>
        {has(p.angle) && has(p.angleDetail) ? <><p><b>{p.angle}</b></p><p className="small">{p.angleDetail}</p></> :
         has(p.angle) ? <p>{p.angle}</p> : <div><GenerateAnglesButton prospectId={p.id} label="Rédiger l'angle commercial" className="btn primary" /></div>}
        {has(p.qualification) && <p className="muted small">Pourquoi maintenant : {p.qualification}</p>}
      </section>

      <div className="grid2 top">
        <section className="panel">
          <div className="panel-head">
            <h2>Prochaine étape email</h2>
            {nextStep && <span className="chip">{nextStep.t} · {days[nextStep.k]}</span>}
          </div>
          {!template && <p className="alert">Ce prospect n&apos;est rattaché à aucune recherche avec séquence : les textes ci-dessous restent vides.</p>}
          {next ? (
            <>
              {nextStep?.subj && <CopyBlock label="Objet" text={next.subject} />}
              <CopyBlock label="Message" text={next.body} multiline />
              <div className="row">
                {account && (status === "À contacter" || ["Contacté", "Relancé"].includes(status)) && (
                  <SendEmailButton prospectId={p.id} label={`Envoyer depuis ${account.email}`} />
                )}
                <form action={markStepDone}>
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className={account ? "btn" : "btn primary"} pending="Mise à jour…">{status === "À contacter" ? "Marquer l'email J0 comme envoyé" : "Marquer la relance comme envoyée"}</SubmitButton>
                </form>
              </div>
              {!account && <p className="hint">Connectez votre boîte Gmail ou Outlook dans Paramètres pour envoyer en un clic. Sinon, copiez le texte puis marquez l&apos;étape comme faite : la relance suivante se programme seule.</p>}
            </>
          ) : (
            <p className="muted">Séquence email terminée ou prospect hors séquence ({status}).</p>
          )}
        </section>
        <QualifCard id={p.id} initial={(p.qualif as Qualif | null) ?? null} />
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Séquence de ce prospect</h2>
          <span className="muted small">{template ? `Modèle : ${template.name}` : "Aucun modèle"}</span>
        </div>
        <SequenceEditor id={p.id} steps={steps} texts={resolved} days={days} />
      </section>

      <section className="panel">
        <h2>Fiche</h2>
        <ProspectForm initial={initial} id={p.id} searches={searches} emailVerified={p.emailVerified} />
      </section>

      {p.mails.length > 0 && (
        <section className="panel">
          <h2>Emails</h2>
          <div className="list">
            {p.mails.map((m) => (
              <div key={m.id} className="li">
                <div>
                  <b>{m.direction === "in" ? "Réponse reçue" : "Envoyé"} · {m.at.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })}</b>
                  <p className="small">{m.subject}</p>
                  {m.snippet && <p className="muted small">{m.snippet}</p>}
                </div>
                {m.direction === "in" && <span className="chip ok">réponse</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {p.calls.length > 0 && (
        <section className="panel">
          <h2>Appels</h2>
          <div className="list">
            {p.calls.map((call) => (
              <div key={call.id} className="li">
                <div>
                  <b>{fmtDay(call.day)}{call.durationMs ? ` · ${Math.max(1, Math.round(call.durationMs / 60000))} min` : ""} · {call.issue}{call.interet ? ` · intérêt ${call.interet}` : ""}</b>
                  {call.resume && <p className="muted small">{call.resume}</p>}
                  {call.next && <p className="small">Prochaine étape : {call.next}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
