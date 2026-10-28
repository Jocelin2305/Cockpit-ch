import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { ConfirmButton, SubmitButton } from "@/components/forms";
import { StatusSelect } from "@/components/status-select";
import {
  canRelance, completeness, dueState, fmtDay, has, PRIO, qualScore, SEQ_STEPS, stepDay, stepText, tplDelays, type Qualif,
} from "@/lib/prospecting";
import { ProspectForm } from "../prospect-form";
import { deleteProspect, markStepDone } from "../actions";
import { QualifCard } from "./qualif-card";
import { SequenceEditor } from "./sequence-editor";
import { CopyBlock } from "./copy-block";

export const metadata: Metadata = { title: "Fiche prospect" };

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const { id } = await params;
  const [p, searches] = await Promise.all([
    db.prospect.findFirst({
      where: { id, organizationId: orgId },
      include: { search: { include: { template: true } }, calls: { orderBy: { createdAt: "desc" } } },
    }),
    db.search.findMany({ where: { organizationId: orgId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!p) notFound();

  const template = p.search?.template ?? null;
  const delays = tplDelays(template?.delays);
  const signature = user.signature || user.name;
  const status = p.status ?? "À contacter";
  const due = dueState(p);

  // Prochaine étape email : J0 si jamais contacté, sinon la relance suivante.
  const nextKey = status === "À contacter" ? "email" : canRelance(p) ? `relance${(p.relances ?? 0) + 1}` : null;
  const nextStep = SEQ_STEPS.find((s) => s.k === nextKey);
  const next = nextStep ? stepText(nextStep.k, nextStep.subj, p, template?.steps, signature) : null;

  // Textes de toutes les étapes, pour l'éditeur de séquence personnalisée.
  const own = (p.sequence ?? {}) as Record<string, string>;
  const resolved = Object.fromEntries(
    SEQ_STEPS.flatMap((s) => {
      const t = stepText(s.k, s.subj, { ...p, sequence: {} }, template?.steps, signature);
      return [[s.k, own[s.k] ?? t.body], ...(s.subj ? [[s.subj, own[s.subj] ?? t.subject]] : [])];
    }),
  ) as Record<string, string>;
  const days = Object.fromEntries(SEQ_STEPS.map((s) => [s.k, stepDay(s, delays)]));

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
            <span className={`prio ${p.priority}`}>{PRIO[p.priority]}</span>
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
        <p>{has(p.angle) ? p.angle : "Pas encore d'angle. Renseignez-le dans « Pilotage » ci-dessous ; la génération automatique arrive avec l'assistant IA."}</p>
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
              <form action={markStepDone}>
                <input type="hidden" name="id" value={p.id} />
                <SubmitButton pending="Mise à jour…">{status === "À contacter" ? "Email J0 envoyé" : "Relance envoyée"}</SubmitButton>
              </form>
              <p className="hint">L&apos;envoi automatique depuis Gmail ou Outlook arrive au sprint 4. En attendant, copiez le texte puis marquez l&apos;étape comme faite : la relance suivante se programme seule.</p>
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
        <SequenceEditor id={p.id} texts={resolved} days={days} />
      </section>

      <section className="panel">
        <h2>Fiche</h2>
        <ProspectForm initial={initial} id={p.id} searches={searches} emailVerified={p.emailVerified} />
      </section>

      {p.calls.length > 0 && (
        <section className="panel">
          <h2>Appels</h2>
          <div className="list">
            {p.calls.map((call) => (
              <div key={call.id} className="li">
                <div><b>{fmtDay(call.day)} · {call.issue}</b><p className="muted small">{call.resume}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
