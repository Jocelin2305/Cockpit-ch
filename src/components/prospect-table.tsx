import Link from "next/link";
import { completeness, dueState, fmtDay, has, isEmail, qualScore, todayISO, type ProspectLike } from "@/lib/prospecting";
import { StatusSelect } from "./status-select";
import { GenerateAnglesButton } from "./ai-buttons";
import { AngleCell, CoordChips, PrioritySelect } from "./prospect-cells";
import { NoteCell } from "./note-cell";

export type Row = ProspectLike & { id: string; company: string; searchId: string | null; searchName?: string | null; seqStoppedAt?: Date | null };

const PRIO_RANK: Record<string, number> = { A: 0, B: 1, C: 2 };

// Ordre de travail : relances en retard, puis du jour, puis par priorité.
export function sortRows<T extends Row>(rows: T[], today = todayISO()) {
  const rank = (p: T) => (dueState(p, today) === "late" ? 0 : dueState(p, today) === "today" ? 1 : 2);
  return [...rows].sort((a, b) => rank(a) - rank(b) || (PRIO_RANK[a.priority ?? "C"] ?? 3) - (PRIO_RANK[b.priority ?? "C"] ?? 3));
}

export function ProspectTable({ rows, showSearch, empty }: { rows: Row[]; showSearch?: boolean; empty: React.ReactNode }) {
  const today = todayISO();
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
              <th>Coordonnées</th>
              <th>Notes</th>
              <th>Statut</th>
              <th>Prochaine relance</th>
              <th>Fiche</th>
              <th>Qualif.</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={showSearch ? 11 : 10} className="muted">{empty}</td></tr>
            )}
            {rows.map((p) => {
              const due = dueState(p, today);
              const c = completeness(p);
              const q = qualScore(p.qualif);
              return (
                <tr key={p.id} className={due === "late" ? "overdue" : due === "today" ? "due" : ""} data-menu="prospect" data-id={p.id} data-name={p.company} data-stopped={p.seqStoppedAt ? "1" : undefined}>
                  <td><PrioritySelect id={p.id} priority={p.priority ?? "C"} /></td>
                  <td>
                    <Link href={`/app/prospects/${p.id}`} className="co"><b>{p.company}</b><span>{p.sector}</span></Link>
                  </td>
                  <td className="angle">{has(p.angle) ? <AngleCell angle={p.angle!} detail={p.angleDetail ?? ""} /> : <GenerateAnglesButton prospectId={p.id} label="Générer l'angle" className="btn sm" />}</td>
                  {showSearch && (
                    <td>{p.searchId ? <Link className="nowrap" href={`/app/recherches/${p.searchId}`}>{p.searchName}</Link> : <span className="muted">—</span>}</td>
                  )}
                  <td><div className="co"><b>{has(p.contactName) ? p.contactName : <span className="enrich">À enrichir</span>}</b><span>{p.contactRole}</span></div></td>
                  <td>
                    <CoordChips
                      p={{ id: p.id, company: p.company, contactName: p.contactName ?? "", phone: p.phone ?? "", status: p.status ?? "", angle: p.angle ?? "", qualification: p.qualification ?? "" }}
                      email={isEmail(p.email) ? p.email!.trim() : ""}
                      linkedin={has(p.linkedin) ? p.linkedin!.trim() : ""}
                    />
                  </td>
                  <td className="notes"><NoteCell id={p.id} notes={p.notes ?? ""} /></td>
                  <td><StatusSelect id={p.id} status={p.status ?? "À contacter"} label={p.company} /></td>
                  <td>
                    {p.seqStoppedAt ? <span className="chip">Séquence stoppée</span>
                      : due === "late" ? <span className="chip late">En retard · {fmtDay(p.nextFollowUp)}</span>
                      : due === "today" ? <span className="chip today">Aujourd&apos;hui</span>
                      : p.nextFollowUp ? <span className="chip">{fmtDay(p.nextFollowUp)}</span>
                      : <span className="muted">—</span>}
                    {p.relances ? <span className="muted mono small"> R{p.relances}</span> : null}
                  </td>
                  <td>
                    <div className={`gauge ${c < 50 ? "low" : c < 75 ? "mid" : ""}`}><div className="g"><i style={{ width: `${c}%` }} /></div><span className="num">{c}%</span></div>
                  </td>
                  <td className="num">{q === null ? <span className="muted">—</span> : `${q} %`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
