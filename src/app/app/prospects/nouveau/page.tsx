import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { ProspectForm } from "../prospect-form";

export const metadata: Metadata = { title: "Nouveau prospect" };

export default async function NewProspectPage({ searchParams }: { searchParams: Promise<{ recherche?: string }> }) {
  const { membership } = await requireMember();
  const { recherche } = await searchParams;
  const searches = await db.search.findMany({ where: { organizationId: membership.organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="view narrow">
      <header className="view-head">
        <div><h1>Nouveau prospect</h1><p className="muted">Seul le nom de l&apos;entreprise est obligatoire. Complétez le reste au fil de vos recherches.</p></div>
      </header>
      <ProspectForm initial={{ searchId: recherche ?? "", priority: "B" }} searches={searches} />
    </div>
  );
}
