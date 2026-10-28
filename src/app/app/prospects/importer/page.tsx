import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { CSV_COLS, CSV_HEAD } from "@/lib/prospecting";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Importer des prospects" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ recherche?: string }> }) {
  const { membership } = await requireMember();
  const { recherche } = await searchParams;
  const searches = await db.search.findMany({ where: { organizationId: membership.organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <h1>Importer des prospects</h1>
          <p className="muted">Un fichier CSV (séparateur point-virgule ou virgule) avec une ligne d&apos;en-têtes. Les colonnes reconnues : {CSV_COLS.map((c) => CSV_HEAD[c]).join(", ")}.</p>
        </div>
      </header>
      <ImportForm searches={searches} defaultSearch={recherche ?? ""} />
    </div>
  );
}
