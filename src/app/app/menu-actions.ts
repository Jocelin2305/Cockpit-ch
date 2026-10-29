"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireMember } from "@/lib/auth";
import { todayISO } from "@/lib/prospecting";

type Res = { ok?: string; error?: string };
const ACTIVE = { status: { notIn: ["Gagné", "Perdu"] } };
const refresh = () => revalidatePath("/app", "layout");

// Stopper : plus aucun email ni relance. Reprendre : la relance suivante redevient due aujourd'hui.
async function setStopped(where: { id?: string; searchId?: string }, stop: boolean): Promise<Res> {
  const { membership } = await requireMember();
  const scope = { organizationId: membership.organizationId, ...where, ...ACTIVE };
  if (stop) {
    const r = await db.prospect.updateMany({ where: { ...scope, seqStoppedAt: null }, data: { seqStoppedAt: new Date(), nextFollowUp: null } });
    refresh();
    return { ok: r.count ? `Séquence stoppée${r.count > 1 ? ` pour ${r.count} prospects` : ""}.` : "La séquence était déjà stoppée." };
  }
  const ids = (await db.prospect.findMany({ where: { ...scope, seqStoppedAt: { not: null } }, select: { id: true } })).map((p) => p.id);
  const [r] = await db.$transaction([
    db.prospect.updateMany({ where: { id: { in: ids } }, data: { seqStoppedAt: null } }),
    db.prospect.updateMany({ where: { id: { in: ids }, status: { in: ["Contacté", "Relancé"] } }, data: { nextFollowUp: todayISO() } }),
  ]);
  refresh();
  return { ok: r.count ? `Séquence reprise${r.count > 1 ? ` pour ${r.count} prospects` : ""}.` : "La séquence n'était pas stoppée." };
}

export async function stopProspectSequence(id: string) { return setStopped({ id }, true); }
export async function resumeProspectSequence(id: string) { return setStopped({ id }, false); }
export async function stopLibrarySequence(searchId: string) { return setStopped({ searchId }, true); }
export async function resumeLibrarySequence(searchId: string) { return setStopped({ searchId }, false); }

// Supprime une bibliothèque et tous ses prospects (appels, emails et notes compris).
export async function deleteLibrary(searchId: string): Promise<Res> {
  const { membership } = await requireAdmin();
  const where = { id: searchId, organizationId: membership.organizationId };
  const search = await db.search.findFirst({ where, select: { name: true } });
  if (!search) return { error: "Bibliothèque introuvable." };
  const [p] = await db.$transaction([
    db.prospect.deleteMany({ where: { organizationId: membership.organizationId, searchId } }),
    db.search.deleteMany({ where }),
  ]);
  refresh();
  return { ok: `« ${search.name} » et ses ${p.count} prospect${p.count > 1 ? "s" : ""} sont supprimés.` };
}

// Supprime un modèle de séquence ; les recherches qui l'utilisaient passent sans séquence.
export async function deleteSequenceTemplate(id: string): Promise<Res> {
  const { membership } = await requireAdmin();
  const r = await db.sequenceTemplate.deleteMany({ where: { id, organizationId: membership.organizationId } });
  refresh();
  return r.count ? { ok: "Séquence supprimée." } : { error: "Séquence introuvable." };
}

export async function deleteProspectById(id: string): Promise<Res> {
  const { membership } = await requireAdmin();
  const r = await db.prospect.deleteMany({ where: { id, organizationId: membership.organizationId } });
  refresh();
  return r.count ? { ok: "Prospect supprimé." } : { error: "Prospect introuvable." };
}
