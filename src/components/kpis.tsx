import type { stats } from "@/lib/prospecting";

export function Kpis({ st }: { st: ReturnType<typeof stats> }) {
  const items: [string, number, string?][] = [
    ["Prospects", st.n],
    ["Contactés", st.contacted],
    ["Emails trouvés", st.emails],
    ["Fiches enrichies", st.enriched],
    ["RDV", st.rdv],
    ["Gagnés", st.won, "win"],
    ["Relances en retard", st.late, st.late ? "alert" : ""],
  ];
  return (
    <div className="kpis seven">
      {items.map(([k, v, c]) => (
        <div key={k} className={`kpi ${c ?? ""}`}><span className="v">{v}</span><span className="k">{k}</span></div>
      ))}
    </div>
  );
}
