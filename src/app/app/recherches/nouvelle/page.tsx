import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { ensureStandardTemplate } from "@/lib/cockpit";
import { aiReady } from "@/lib/ai";
import { SearchWizard } from "../search-wizard";
import { wizardOptions } from "../load";

export const metadata: Metadata = { title: "Nouvelle recherche" };

export default async function NewSearchPage() {
  const { membership } = await requireAdmin();
  await ensureStandardTemplate(membership.organizationId);
  const { templateOptions, presets } = await wizardOptions(membership.organizationId);
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <h1>Nouvelle recherche</h1>
          <p className="muted">Une recherche regroupe vos prospects autour de critères communs et d&apos;une séquence emails + LinkedIn.</p>
        </div>
      </header>
      <SearchWizard presets={presets} templates={templateOptions} aiEnabled={aiReady(membership.organization)} />
    </div>
  );
}
