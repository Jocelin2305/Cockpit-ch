import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { tplDelays } from "@/lib/prospecting";
import { ConfirmButton } from "@/components/forms";
import { TemplateEditor } from "./template-editor";
import { deleteTemplate } from "../actions";

export const metadata: Metadata = { title: "Séquence" };

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { membership } = await requireMember();
  const { id } = await params;
  const t = await db.sequenceTemplate.findFirst({
    where: { id, organizationId: membership.organizationId },
    include: { searches: { select: { id: true, name: true } } },
  });
  if (!t) notFound();
  const isAdmin = membership.role === ROLES.ADMIN;
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <Link href="/app/sequences" className="small">← Bibliothèque de séquences</Link>
          <h1>{t.name}</h1>
          <p className="muted">
            {t.searches.length ? <>Utilisée par : {t.searches.map((s, i) => <span key={s.id}>{i ? ", " : ""}<Link href={`/app/recherches/${s.id}`}>{s.name}</Link></span>)}</> : "Utilisée par aucune recherche."}
          </p>
        </div>
        {isAdmin && (
          <form action={deleteTemplate}>
            <input type="hidden" name="id" value={t.id} />
            <ConfirmButton confirm="Confirmer la suppression">Supprimer</ConfirmButton>
          </form>
        )}
      </header>
      <TemplateEditor id={t.id} name={t.name} delays={tplDelays(t.delays)} steps={(t.steps ?? {}) as Record<string, string>} readOnly={!isAdmin} />
    </div>
  );
}
