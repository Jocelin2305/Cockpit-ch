"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { delaysFor } from "@/lib/cockpit";
import { aiErrorMessage } from "@/lib/ai";
import { analyzeCallNotes, type CallReport } from "@/lib/ai-features";
import { addDays, FRAMEWORKS, isEmail, STATUSES, statusPatch, todayISO, type Qualif } from "@/lib/prospecting";

const QUICK = {
  noanswer: { issue: "Pas de réponse", days: 2 },
  voicemail: { issue: "Messagerie, message laissé", days: 3 },
  wrong: { issue: "Mauvais numéro", days: 0 },
  nointerest: { issue: "Pas intéressé", days: 0 },
} as const;
export type QuickKind = keyof typeof QUICK;

const ms = (n: unknown) => Math.max(0, Math.min(6 * 3600_000, Math.round(Number(n) || 0)));

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

const reportSchema = z.object({
  notes: z.string().max(20000),
  durationMs: z.number(),
  resume: z.string().max(3000),
  interet: z.string().max(20).default(""),
  objections: z.array(z.string().max(500)).max(20).default([]),
  next: z.string().max(1000).default(""),
  statut: z.string().optional(),
  rappelLe: z.string().nullable().optional(),
  framework: z.string().optional(),
  qualification: z.array(z.object({ critere: z.string(), niveau: z.number() })).optional(),
  infos: z.object({ contactName: z.string().nullable(), contactRole: z.string().nullable(), email: z.string().nullable(), notes: z.string().nullable() }).partial().optional(),
});
export type ReportInput = z.input<typeof reportSchema>;

// Enregistre le compte rendu (proposé par l'IA ou saisi à la main) et met la fiche à jour.
export async function saveCallReport(prospectId: string, input: ReportInput | (CallReport & { notes: string; durationMs: number; next: string })) {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const p = await owned(orgId, prospectId);
  if (!p) return { error: "Prospect introuvable." };
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { error: "Compte rendu invalide." };
  const r = parsed.data;
  const today = todayISO();

  const data: Record<string, unknown> = { lastCallAt: today };
  if (r.statut && r.statut !== p.status && STATUSES.includes(r.statut as (typeof STATUSES)[number]))
    Object.assign(data, statusPatch(p, r.statut, await delaysFor(orgId, p.searchId), today));
  data.callBack = r.rappelLe && /^\d{4}-\d{2}-\d{2}$/.test(r.rappelLe) ? r.rappelLe : null;

  // Qualification : un critère ne redescend jamais à cause d'un appel.
  if (r.framework && FRAMEWORKS[r.framework] && r.qualification?.length) {
    const prev = (p.qualif as Qualif | null)?.fw === r.framework ? (p.qualif as Qualif).v : {};
    const v: Record<string, number> = { ...prev };
    for (const { critere, niveau } of r.qualification)
      if (FRAMEWORKS[r.framework].includes(critere)) v[critere] = Math.max(v[critere] ?? 0, Math.min(2, Math.max(0, Math.round(niveau))));
    data.qualif = { fw: r.framework, v };
  }
  // Informations dites pendant l'appel : seulement si le champ est vide.
  const inf = r.infos ?? {};
  if (inf.contactName && !p.contactName) data.contactName = inf.contactName.slice(0, 200);
  if (inf.contactRole && !p.contactRole) data.contactRole = inf.contactRole.slice(0, 200);
  if (inf.email && isEmail(inf.email) && !isEmail(p.email)) data.email = inf.email.trim();
  if (inf.notes) data.notes = `${p.notes ? `${p.notes}\n` : ""}${today} : ${inf.notes}`.slice(-4000);

  await db.$transaction([
    db.call.create({
      data: {
        organizationId: orgId, prospectId, userId: user.id, day: today, issue: "Appel",
        resume: r.resume || r.notes.slice(0, 600), interet: r.interet, objections: r.objections, next: r.next,
        durationMs: ms(r.durationMs), transcript: r.notes.slice(0, 15000),
      },
    }),
    db.prospect.update({ where: { id: prospectId }, data }),
  ]);
  revalidatePath("/app", "layout");
  return { ok: "Compte rendu enregistré, fiche mise à jour." };
}
