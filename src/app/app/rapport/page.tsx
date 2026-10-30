import { ReportNowButton } from "../parametres/report-now";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { REPORT_ROWS, weeklyReport } from "@/lib/weekly-report";

export const metadata: Metadata = { title: "Rapport hebdomadaire" };

const fr = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
const trend = (a: number, b: number) => (a === b ? <span className="muted">=</span> : a > b ? <span className="chip ok">+{a - b}</span> : <span className="chip late">{a - b}</span>);

// Le rapport envoyé chaque lundi aux administrateurs, consultable à tout moment.
export default async function ReportPage() {
  const { membership } = await requireAdmin();
  const r = await weeklyReport(membership.organizationId);
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">Rapport hebdomadaire</span>
          <h1>Votre semaine de prospection</h1>
          <p className="muted">Du {fr(r.from)} au {fr(r.to)}, comparée à la semaine précédente. Ce rapport part chaque lundi matin par email aux administrateurs.</p>
        </div>
        <ReportNowButton />
      </header>
      <div className="kpis">
        {REPORT_ROWS.slice(0, 4).map(([k, l]) => <div key={k} className="kpi"><span className="v">{r.week[k]}</span><span className="k">{l} {trend(r.week[k], r.prev[k])}</span></div>)}
      </div>
      <div className="kpis">
        {REPORT_ROWS.slice(4).map(([k, l]) => <div key={k} className={`kpi${k === "rdv" || k === "won" ? " win" : ""}`}><span className="v">{r.week[k]}</span><span className="k">{l} {trend(r.week[k], r.prev[k])}</span></div>)}
      </div>
      {r.rdvs.length > 0 && (
        <section className="panel"><h2>Rendez-vous obtenus</h2><ul className="list">{r.rdvs.map((x) => <li key={x}>{x}</li>)}</ul></section>
      )}
      {r.team.length > 0 && (
        <section className="panel flush">
          <div className="panel-head pad"><h2>Par commercial</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Commercial</th>{REPORT_ROWS.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
              <tbody>{r.team.map((t) => <tr key={t.name}><td><b>{t.name}</b></td>{REPORT_ROWS.map(([k]) => <td key={k} className="num">{t.c[k]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
      <p className="alert">Cette semaine : <b>{r.due}</b> relance{r.due > 1 ? "s" : ""} à envoyer et <b>{r.toCall}</b> rappel{r.toCall > 1 ? "s" : ""} prévu{r.toCall > 1 ? "s" : ""}. <Link href="/app">Ouvrir le point du jour</Link></p>
    </div>
  );
}
