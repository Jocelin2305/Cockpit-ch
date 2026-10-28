import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { ensureStandardTemplate } from "@/lib/cockpit";
import { tplDelays } from "@/lib/prospecting";
import { SubmitButton } from "@/components/forms";
import { createTemplate } from "./actions";

export const metadata: Metadata = { title: "Séquences" };

export default async function SequencesPage() {
  const { membership } = await requireMember();
  await ensureStandardTemplate(membership.organizationId);
  const templates = await db.sequenceTemplate.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { createdAt: "asc" },
    include: { searches: { select: { id: true, name: true } } },
  });
  const isAdmin = membership.role === ROLES.ADMIN;
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Bibliothèque de séquences</h1>
          <p className="muted">Des modèles réutilisables : emails (J0 + 5 relances) et LinkedIn en parallèle. Chaque recherche en utilise un.</p>
        </div>
        {isAdmin && (
          <form action={createTemplate}>
            <SubmitButton pending="Création…">+ Nouvelle séquence</SubmitButton>
          </form>
        )}
      </header>
      <div className="cards">
        {templates.map((t) => (
          <Link key={t.id} href={`/app/sequences/${t.id}`} className="card">
            <b>{t.name}</b>
            <span className="muted small">{tplDelays(t.delays).length} relances email : J+{tplDelays(t.delays).join(", J+")}</span>
            <span className="small">{t.searches.length ? `Utilisée par : ${t.searches.map((s) => s.name).join(", ")}` : "Utilisée par aucune recherche"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
