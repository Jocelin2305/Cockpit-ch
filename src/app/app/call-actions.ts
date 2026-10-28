"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { delaysFor } from "@/lib/cockpit";
import { aiErrorMessage } from "@/lib/ai";
import { analyzeCallNotes, type CallReport } from "@/lib/ai-features";
import { addDays, FRAMEWORKS, statusPatch, todayISO, type Qualif } from "@/lib/prospecting";
import { callFields, clampMs as ms, reportPatch, reportSchema, type ReportInput } from "@/lib/calls";

const QUICK = {
  noanswer: { issue: "Pas de réponse", days: 2 },
  voicemail: { issue: "Messagerie, message laissé", days: 3 },
  wrong: { issue: "Mauvais numéro", days: 0 },
  nointerest: { issue: "Pas intéressé", days: 0 },
} as const;
export type QuickKind = keyof typeof QUICK;


async function owned(organizationId: string, id: string) {
  return db.prospect.findFirst({ where: { id, organizationId } });
}

// Issue rapide d'un appel : un clic, l'appel est consigné et le rappel programmé.
export async function quickOutcome(prospectId: string, kind: QuickKind, durationMs: number) {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const p = await owned(orgId, prospectId);
  const q = QUICK[kind];
  if (!p || !q) return { error: "Prospect introuvable." };
  const today = todayISO();
  const data: Record<string, unknown> = { lastCallAt: today };
  if (kind === "noanswer" || kind === "voicemail") data.callBack = addDays(today, q.days);
  if (kind === "wrong") { data.phone = ""; data.callBack = null; }
  if (kind === "nointerest") { Object.assign(data, statusPatch(p, "Perdu", await delaysFor(orgId, p.searchId), today)); data.callBack = null; }
  await db.$transaction([
    db.call.create({ data: { organizationId: orgId, prospectId, userId: user.id, day: today, issue: q.issue, durationMs: ms(durationMs) } }),
    db.prospect.update({ where: { id: prospectId }, data }),
  ]);
  revalidatePath("/app", "layout");
  return { ok: `${q.issue}${data.callBack ? ` · rappel le ${String(data.callBack).slice(8, 10)}/${String(data.callBack).slice(5, 7)}` : ""}` };
}

// Analyse IA d'une transcription : renvoie une proposition, rien n'est enregistré.
export async function analyzeCall(prospectId: string, notes: string) {
  const { user, membership } = await requireMember();
  const p = await owned(membership.organizationId, prospectId);
  if (!p) return { error: "Prospect introuvable." };
  if (notes.trim().length < 20) return { error: "Collez la transcription ou écrivez quelques lignes de notes." };
  const fw = (p.qualif as Qualif | null)?.fw && FRAMEWORKS[(p.qualif as Qualif).fw] ? (p.qualif as Qualif).fw : "BANT";
  try {
    const report = await analyzeCallNotes({ organizationId: membership.organizationId, userId: user.id }, p, notes, FRAMEWORKS[fw]);
    return { report, framework: fw };
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
}

export type { ReportInput };

// Enregistre le compte rendu (proposé par l'IA ou saisi à la main) et met la fiche à jour.
export async function saveCallReport(prospectId: string, input: ReportInput | (CallReport & { notes: string; durationMs: number; next: string })) {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const p = await owned(orgId, prospectId);
  if (!p) return { error: "Prospect introuvable." };
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { error: "Compte rendu invalide." };
  const data = await reportPatch(p, parsed.data);
  await db.$transaction([
    db.call.create({ data: { organizationId: orgId, prospectId, userId: user.id, day: todayISO(), ...callFields(parsed.data) } }),
    db.prospect.update({ where: { id: prospectId }, data }),
  ]);
  revalidatePath("/app", "layout");
  return { ok: "Compte rendu enregistré, fiche mise à jour." };
}

// Recherche rapide d'un prospect, pour la saisie manuelle d'un appel.
export async function findProspects(q: string) {
  const { membership } = await requireMember();
  const term = q.trim().slice(0, 80);
  const rows = await db.prospect.findMany({
    where: {
      organizationId: membership.organizationId,
      ...(term ? { OR: [{ company: { contains: term, mode: "insensitive" } }, { contactName: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: { id: true, company: true, contactName: true, phone: true, status: true, angle: true, qualification: true },
  });
  return rows;
}
