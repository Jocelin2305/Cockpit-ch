import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ConfirmButton } from "@/components/forms";
import { SearchWizard } from "../../search-wizard";
import { wizardOptions } from "../../load";
import { deleteSearch } from "../../actions";

export const metadata: Metadata = { title: "Modifier la recherche" };

export default async function EditSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { membership } = await requireAdmin();
  const { id } = await params;
  const search = await db.search.findFirst({ where: { id, organizationId: membership.organizationId } });
  if (!search) notFound();
  const { templateOptions } = await wizardOptions(membership.organizationId);
  const initial = Object.fromEntries(
    (["name", "geo", "secteur", "ca", "salaries", "motifs", "activite", "prix", "diff", "fonctions", "volume", "ton", "notes"] as const).map((k) => [k, search[k]]),
  );
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <h1>Modifier « {search.name} »</h1>
          <p className="muted">Les prospects de la recherche ne sont pas modifiés.</p>
        </div>
        <form action={deleteSearch}>
          <input type="hidden" name="id" value={search.id} />
          <ConfirmButton confirm="Confirmer (les prospects sont conservés)">Supprimer la recherche</ConfirmButton>
        </form>
      </header>
      <SearchWizard presets={[]} templates={templateOptions} initial={initial} searchId={search.id} initialTemplateId={search.templateId} />
    </div>
  );
}
