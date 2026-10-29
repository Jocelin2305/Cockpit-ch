import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { stats, tplDelays } from "@/lib/prospecting";
import { ProspectTable, sortRows } from "@/components/prospect-table";
import { Kpis } from "@/components/kpis";
import { GenerateAnglesButton, SearchAiPanel } from "@/components/ai-buttons";
import { EnrichButton, LaunchSearchButton } from "@/components/sourcing-buttons";
import { ciblageLabel } from "@/lib/sourcing-data";
import { sourcingQuery } from "@/lib/sourcing";

export const metadata: Metadata = { title: "Recherche" };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ alerte?: string }> }) {
  const { membership } = await requireMember();
  const { id } = await params;
  const { alerte } = await searchParams;
  const search = await db.search.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: { template: true, prospects: true },
  });
  if (!search) notFound();
  const st = stats(search.prospects);
  const crit = [search.geo, search.secteur, search.salaries && `${search.salaries} salariés`, search.ca && `CA ${search.ca}`, search.motifs, search.fonctions && `Cibles : ${search.fonctions}`].filter(Boolean);

  return (
    <div className="view wide">
      <header className="view-head">
        <div>
          <span className="label">Recherche</span>
          <h1>{search.name}</h1>
          <p className="muted">{crit.join(" · ") || "Critères non renseignés"}</p>
          <p className="muted small">
            Séquence : {search.template ? <Link href={`/app/sequences/${search.template.id}`}>{search.template.name}</Link> : <span className="enrich">aucune</span>}
            {search.template && ` (${tplDelays(search.template.delays).length} relances : J+${tplDelays(search.template.delays).join(", J+")})`}
          </p>
        </div>
        <div className="row">
          <Link className="btn" href={`/app/prospects/importer?recherche=${search.id}`}>Importer</Link>
          <a className="btn" href={`/app/prospects/export?recherche=${search.id}`}>Exporter</a>
          {membership.role === ROLES.ADMIN && <Link className="btn" href={`/app/recherches/${search.id}/modifier`}>Modifier</Link>}
          <Link className="btn primary" href={`/app/prospects/nouveau?recherche=${search.id}`}>+ Prospect</Link>
        </div>
      </header>
      {alerte && <p className="alert">{alerte}</p>}
      <section className="panel" data-tip="Trouvez de vraies entreprises selon vos critères ; chaque nouveau lancement ajoute celles qui manquent.">
        <div className="panel-head"><h2>Recherche automatique de prospects</h2>{search.sourcedAt && <span className="label">dernier lancement : {search.sourcedAt.toLocaleDateString("fr-FR")}</span>}</div>
        <p className="muted small">Critères : {ciblageLabel(search) || <span className="enrich">aucun</span>}{search.fonctions && <> · contacts visés : {search.fonctions}</>}</p>
        {sourcingQuery(search) ? (
          <div className="sourcing">
            <LaunchSearchButton searchId={search.id} first={!search.sourcedAt} />
            {membership.organization.apolloKeyEnc ? <EnrichButton searchId={search.id} /> : <span className="muted small">Pour les emails et LinkedIn des contacts, <Link href="/app/parametres">connectez Apollo</Link>.</span>}
          </div>
        ) : (
          <p className="muted small">{membership.role === ROLES.ADMIN ? <>Ajoutez une zone ou un secteur dans <Link href={`/app/recherches/${search.id}/modifier`}>les critères de la recherche</Link> pour lancer la recherche automatique.</> : "Demandez à un administrateur de compléter les critères de la recherche automatique."}</p>
        )}
        <p className="hint">Source : registre national des entreprises (Sirene / RNE, données publiques). Priorité A : bon poste et coordonnées complètes ; B : décideur identifié ; C : à compléter.</p>
      </section>
      <div className="row">
        <GenerateAnglesButton searchId={search.id} label="Angles manquants" className="btn sm ghost" />
      </div>
      <SearchAiPanel searchId={search.id} />
      <Kpis st={st} />
      <ProspectTable rows={sortRows(search.prospects)} empty="Aucun prospect dans cette recherche : importez une liste ou ajoutez-en un." />
    </div>
  );
}
