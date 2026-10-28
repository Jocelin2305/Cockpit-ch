// Compte rendu d'appel appliqué à la fiche : saisi à la main, proposé par l'IA ou reçu de la téléphonie.
import type { Prospect } from "@prisma/client";
import { z } from "zod";
import { delaysFor } from "./cockpit";
import { FRAMEWORKS, isEmail, STATUSES, statusPatch, todayISO, type Qualif } from "./prospecting";

export const reportSchema = z.object({
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
type Report = z.output<typeof reportSchema>;

export const clampMs = (n: unknown) => Math.max(0, Math.min(6 * 3600_000, Math.round(Number(n) || 0)));

// Champs de la fiche mis à jour par un compte rendu.
export async function reportPatch(p: Prospect, r: Report) {
  const today = todayISO();
  const data: Record<string, unknown> = { lastCallAt: today };
  if (r.statut && r.statut !== p.status && STATUSES.includes(r.statut as (typeof STATUSES)[number]))
    Object.assign(data, statusPatch(p, r.statut, await delaysFor(p.organizationId, p.searchId), today));
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
  return data;
}

export const callFields = (r: Report) => ({
  issue: "Appel", resume: r.resume || r.notes.slice(0, 600), interet: r.interet, objections: r.objections, next: r.next,
  durationMs: clampMs(r.durationMs), transcript: r.notes.slice(0, 15000),
});
