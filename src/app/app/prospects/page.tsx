import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { isDue, PRIO, STATUSES, todayISO } from "@/lib/prospecting";
import { ProspectTable, sortRows } from "@/components/prospect-table";

export const metadata: Metadata = { title: "Prospects" };

type Filters = { q?: string; statut?: string; priorite?: string; recherche?: string; dues?: string };

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { membership } = await requireMember();
  const orgId = membership.organizationId;
  const f = await searchParams;
  const [prospects, searches] = await Promise.all([
    db.prospect.findMany({
      where: {
        organizationId: orgId,
        ...(f.statut ? { status: f.statut } : {}),
        ...(f.priorite ? { priority: f.priorite } : {}),
        ...(f.recherche === "aucune" ? { searchId: null } : f.recherche ? { searchId: f.recherche } : {}),
        ...(f.q
          ? { OR: ["company", "contactName", "city", "sector", "contactRole"].map((k) => ({ [k]: { contains: f.q } })) }
          : {}),
      },
      include: { search: { select: { name: true } } },
      take: 1000,
    }),
    db.search.findMany({ where: { organizationId: orgId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const today = todayISO();
  const rows = sortRows(
    prospects.filter((p) => !f.dues || isDue(p, today)).map((p) => ({ ...p, searchName: p.search?.name })),
    today,
  );
  const exportHref = `/app/prospects/export${f.recherche && f.recherche !== "aucune" ? `?recherche=${f.recherche}` : ""}`;

  return (
    <div className="view wide">
      <header className="view-head">
        <div>
          <h1>Tableau de suivi</h1>
          <p className="muted">Statuts, relances, complétude des fiches et qualification se mettent à jour à chaque action.</p>
        </div>
        <div className="row">
          <Link className="btn" href="/app/prospects/importer">Importer</Link>
          <a className="btn" href={exportHref}>Exporter CSV</a>
          <Link className="btn primary" href="/app/prospects/nouveau">+ Ajouter</Link>
        </div>
      </header>

      <form className="toolbar" method="get">
        <input className="input" name="q" type="search" defaultValue={f.q} placeholder="Entreprise, contact, ville…" aria-label="Rechercher" />
        <select className="input" name="statut" defaultValue={f.statut ?? ""} aria-label="Statut">
          <option value="">Tous statuts</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input" name="priorite" defaultValue={f.priorite ?? ""} aria-label="Priorité">
          <option value="">Toutes priorités</option>
          {Object.entries(PRIO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className="input" name="recherche" defaultValue={f.recherche ?? ""} aria-label="Recherche">
          <option value="">Toutes recherches</option>
          {searches.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          <option value="aucune">Sans recherche</option>
        </select>
        <label className="check"><input type="checkbox" name="dues" value="1" defaultChecked={!!f.dues} /> Relances dues</label>
        <button className="btn" type="submit">Filtrer</button>
      </form>

      <ProspectTable
        rows={rows}
        showSearch
        empty={prospects.length ? "Aucun prospect ne correspond à ces filtres." : "Aucun prospect pour l'instant. Ajoutez-en un ou importez une liste."}
      />
      <p className="hint">Coordonnées : T numéro direct · E email direct · L LinkedIn · Q phrase de qualification. Une valeur « À enrichir » compte comme manquante.</p>
    </div>
  );
}
