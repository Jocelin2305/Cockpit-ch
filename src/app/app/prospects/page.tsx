import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { isDue, PRIO, STATUSES, todayISO } from "@/lib/prospecting";
import { ProspectTable, sortRows } from "@/components/prospect-table";
import { GenerateAnglesButton } from "@/components/ai-buttons";
import { LaunchSequenceButton, UpdateCrmButton } from "@/components/mail-buttons";
import { CRM_PROVIDERS, type CrmProvider } from "@/lib/crm-providers";

export const metadata: Metadata = { title: "Prospects" };

type Filters = { q?: string; statut?: string; priorite?: string; recherche?: string; dues?: string };

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const f = await searchParams;
  // Rien n'est affiché tant qu'aucune bibliothèque (ou « Tous les prospects ») n'est ouverte.
  const open = !!(f.recherche || f.q || f.statut || f.priorite || f.dues);
  const searchId = f.recherche && !["tous", "aucune"].includes(f.recherche) ? f.recherche : null;
  const [prospects, searches, mailbox] = await Promise.all([
    !open ? [] : db.prospect.findMany({
      where: {
        organizationId: orgId,
        ...(f.statut ? { status: f.statut } : {}),
        ...(f.priorite ? { priority: f.priorite } : {}),
        ...(f.recherche === "aucune" ? { searchId: null } : searchId ? { searchId } : {}),
        ...(f.q
          ? { OR: ["company", "contactName", "city", "sector", "contactRole"].map((k) => ({ [k]: { contains: f.q, mode: "insensitive" as const } })) }
          : {}),
      },
      include: { search: { select: { name: true } } },
      take: 1000,
    }),
    db.search.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, _count: { select: { prospects: true } } }, orderBy: { createdAt: "asc" } }),
    db.mailAccount.findUnique({ where: { userId: user.id }, select: { id: true } }),
  ]);
  const toContact = prospects.filter((p) => p.status === "À contacter" && p.email.includes("@") && p.searchId).length;
  const crm = membership.organization.crmProvider as CrmProvider | null;
  const current = searches.find((s) => s.id === searchId);
  const today = todayISO();
  const rows = sortRows(
    prospects.filter((p) => !f.dues || isDue(p, today)).map((p) => ({ ...p, searchName: p.search?.name })),
    today,
  );
  const exportHref = `/app/prospects/export${searchId ? `?recherche=${searchId}` : ""}`;

  return (
    <div className="view wide">
      <header className="view-head">
        <div>
          <h1>{current ? current.name : open ? "Tableau de suivi" : "Prospects"}</h1>
          <p className="muted">{open ? "Statuts, relances, complétude des fiches et qualification se mettent à jour à chaque action." : "Ouvrez une bibliothèque pour voir ses prospects et lancer sa séquence."}</p>
        </div>
        <div className="row">
          {open && <GenerateAnglesButton label="Angles manquants" />}
          {open && crm && CRM_PROVIDERS[crm] && <UpdateCrmButton searchId={searchId} crm={CRM_PROVIDERS[crm]} />}
          <Link className="btn" href={`/app/prospects/importer${searchId ? `?recherche=${searchId}` : ""}`}>Importer</Link>
          {open && <a className="btn" href={exportHref}>Exporter CSV</a>}
          <Link className="btn" href="/app/prospects/nouveau">+ Ajouter</Link>
          {open && f.recherche !== "aucune" && <LaunchSequenceButton searchId={searchId} count={toContact} ready={!!mailbox} />}
        </div>
      </header>

      <section className="library" aria-label="Bibliothèque de recherches" data-tip="Vos recherches : chaque bibliothèque regroupe une cible, ses prospects et sa séquence. Cliquez pour l'ouvrir.">
        <span className="label">Bibliothèque de recherches</span>
        <div className="library-list">
          <Link className={`lib-card${f.recherche === "tous" ? " on" : ""}`} href="/app/prospects?recherche=tous"><b>Tous les prospects</b><span className="muted small">{searches.reduce((n, s) => n + s._count.prospects, 0)}</span></Link>
          {searches.map((s) => (
            <span key={s.id} className={`lib-card${f.recherche === s.id ? " on" : ""}`}>
              <Link href={`/app/prospects?recherche=${s.id}`}><b>{s.name}</b></Link>
              <span className="muted small">{s._count.prospects} prospects · <Link href={`/app/recherches/${s.id}`}>ouvrir</Link></span>
            </span>
          ))}
          {membership.role === ROLES.ADMIN && <Link className="lib-card add" href="/app/recherches/nouvelle"><b>+ Créer une recherche</b><span className="muted small">questionnaire en 2 minutes</span></Link>}
        </div>
      </section>

      {!open ? (
        <p className="library-hint muted">Cliquez sur une bibliothèque pour afficher ses prospects.</p>
      ) : (<>
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
        <select className="input" name="recherche" defaultValue={f.recherche ?? "tous"} aria-label="Recherche">
          <option value="tous">Toutes recherches</option>
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
      <p className="hint">Coordonnées : cliquez sur T (numéro direct), E (email) ou L (LinkedIn) pour les afficher. Une valeur « À enrichir » compte comme manquante.{!mailbox && <> Pour lancer une séquence, <Link href="/app/parametres">connectez votre boîte mail</Link>.</>}</p>
      </>)}
    </div>
  );
}
