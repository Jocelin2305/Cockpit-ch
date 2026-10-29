import Link from "next/link";
import { dueState, fmtDay, has, isEmail, todayISO, type ProspectLike } from "@/lib/prospecting";
import { StatusSelect } from "./status-select";
import { GenerateAnglesButton } from "./ai-buttons";
import { AngleCell, PrioritySelect } from "./prospect-cells";
import { NoteCell } from "./note-cell";
import { EmailCell, PhoneCell } from "./contact-cells";

export type Interaction = { kind: "email" | "reponse" | "appel"; at: Date };
export type Row = ProspectLike & {
  id: string; company: string; searchId: string | null; searchName?: string | null; seqStoppedAt?: Date | null;
  createdAt?: Date; last?: Interaction | null;
};

const PRIO_RANK: Record<string, number> = { A: 0, B: 1, C: 2 };
const STATUS_RANK = ["À contacter", "Contacté", "Relancé", "A répondu", "RDV planifié", "Gagné", "Perdu"];

export const SORTS = [
  ["ajout", "Date d'ajout"],
  ["priorite", "Priorité"],
  ["entreprise", "Entreprise (A → Z)"],
  ["statut", "Statut"],
  ["relance", "Prochaine relance"],
  ["interaction", "Dernière interaction"],
] as const;

// Tri choisi dans la barre de tri ; l'ordre ne bouge pas quand on change un statut (sauf tri par statut).
export function sortRows<T extends Row>(rows: T[], sort = "ajout") {
  const t = (d?: Date | null) => d?.getTime() ?? 0;
  const by: Record<string, (a: T, b: T) => number> = {
    ajout: (a, b) => t(b.createdAt) - t(a.createdAt),
    priorite: (a, b) => (PRIO_RANK[a.priority ?? "C"] ?? 3) - (PRIO_RANK[b.priority ?? "C"] ?? 3),
    entreprise: (a, b) => a.company.localeCompare(b.company, "fr"),
    statut: (a, b) => STATUS_RANK.indexOf(a.status ?? "") - STATUS_RANK.indexOf(b.status ?? ""),
    relance: (a, b) => (a.nextFollowUp ?? "9999").localeCompare(b.nextFollowUp ?? "9999"),
    interaction: (a, b) => t(b.last?.at) - t(a.last?.at),
  };
  return [...rows].sort((a, b) => (by[sort] ?? by.ajout)(a, b) || t(b.createdAt) - t(a.createdAt) || a.id.localeCompare(b.id));
}

const LAST_LABEL: Record<Interaction["kind"], string> = { email: "Email envoyé", reponse: "Réponse reçue", appel: "Appel" };
const day = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

export function ProspectTable({ rows, showSearch, empty }: { rows: Row[]; showSearch?: boolean; empty: React.ReactNode }) {
  const today = todayISO();
  const cols = showSearch ? 12 : 11;
  return (
    <div className="panel flush" data-tour="table">
      <div className="table-wrap">
        <table className="prospects">
          <thead>
            <tr>
              <th>Priorité</th>
              <th>Entreprise</th>
              <th>Angle commercial</th>
              {showSearch && <th>Recherche</th>}
              <th>Décideur</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>LinkedIn</th>
              <th>Statut</th>
              <th>Dernière interaction</th>
              <th>Prochaine relance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={cols} className="muted">{empty}</td></tr>
            )}
            {rows.map((p) => {
              const due = dueState(p, today);
              const target = { id: p.id, company: p.company, contactName: p.contactName ?? "", phone: has(p.phone) ? p.phone!.trim() : "", status: p.status ?? "", angle: p.angle ?? "", qualification: p.qualification ?? "" };
              const canSend = !p.seqStoppedAt && !["A répondu", "RDV planifié", "Gagné", "Perdu"].includes(p.status ?? "");
              return (
                <tr key={p.id} className={due === "late" ? "overdue" : due === "today" ? "due" : ""} data-menu="prospect" data-id={p.id} data-name={p.company} data-stopped={p.seqStoppedAt ? "1" : undefined}>
                  <td><PrioritySelect id={p.id} priority={p.priority ?? "C"} /></td>
                  <td className="co-cell">
                    <Link href={`/app/prospects/${p.id}`} className="co"><b>{p.company}</b></Link>
                    <NoteCell id={p.id} notes={p.notes ?? ""} />
                  </td>
                  <td className="angle">{has(p.angle) ? <AngleCell angle={p.angle!} detail={p.angleDetail ?? ""} /> : <GenerateAnglesButton prospectId={p.id} label="Générer l'angle" className="btn sm" />}</td>
                  {showSearch && (
                    <td>{p.searchId ? <Link className="nowrap" href={`/app/recherches/${p.searchId}`}>{p.searchName}</Link> : <span className="muted">—</span>}</td>
                  )}
                  <td><div className="co"><b>{has(p.contactName) ? p.contactName : <span className="enrich">À enrichir</span>}</b><span>{p.contactRole}</span></div></td>
                  <td><EmailCell id={p.id} email={isEmail(p.email) ? p.email!.trim() : ""} company={p.company} canSend={canSend} /></td>
                  <td className="nowrap"><PhoneCell p={target} /></td>
                  <td>{has(p.linkedin) ? <a href={p.linkedin!.trim()} target="_blank" rel="noreferrer">Profil</a> : <span className="muted">—</span>}</td>
                  <td><StatusSelect id={p.id} status={p.status ?? "À contacter"} label={p.company} /></td>
                  <td className="nowrap">{p.last ? <span className="small">{LAST_LABEL[p.last.kind]}<span className="muted"> · {day(p.last.at)}</span></span> : <span className="muted">—</span>}</td>
                  <td>
                    {p.seqStoppedAt ? <span className="chip">Séquence stoppée</span>
                      : due === "late" ? <span className="chip late">En retard · {fmtDay(p.nextFollowUp)}</span>
                      : due === "today" ? <span className="chip today">Aujourd&apos;hui</span>
                      : p.nextFollowUp ? <span className="chip">{fmtDay(p.nextFollowUp)}</span>
                      : <span className="muted">—</span>}
                    {p.relances ? <span className="muted mono small"> R{p.relances}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// À inclure dans la requête des prospects pour la colonne « Dernière interaction ».
export const LAST_INCLUDE = {
  mails: { orderBy: { at: "desc" as const }, take: 1, select: { direction: true, at: true } },
  calls: { orderBy: { createdAt: "desc" as const }, take: 1, select: { createdAt: true } },
};
export function lastInteraction(p: { mails?: { direction: string; at: Date }[]; calls?: { createdAt: Date }[] }): Interaction | null {
  const m = p.mails?.[0], c = p.calls?.[0];
  const mail = m ? { kind: (m.direction === "in" ? "reponse" : "email") as Interaction["kind"], at: m.at } : null;
  const call = c ? { kind: "appel" as const, at: c.createdAt } : null;
  if (!mail) return call;
  if (!call) return mail;
  return mail.at > call.at ? mail : call;
}
