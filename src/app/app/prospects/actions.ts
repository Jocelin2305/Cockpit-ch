"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, requireMember } from "@/lib/auth";
import { delaysFor, ownedSearchId } from "@/lib/cockpit";
import { FIELDS, FRAMEWORKS, STATUSES, statusPatch, TPL_KEYS, todayISO, type Qualif } from "@/lib/prospecting";
import type { FormState } from "@/lib/validation";

const prospectSchema = z.object({
  ...Object.fromEntries(FIELDS.map((f) => [f.key, z.string().trim().max(5000).default("")])),
  company: z.string().trim().min(1, { error: "Indiquez au moins le nom de l'entreprise." }).max(200),
  priority: z.enum(["A", "B", "C"]).default("B"),
});

const refresh = (id?: string) => {
  revalidatePath("/app", "layout");
  if (id) revalidatePath(`/app/prospects/${id}`);
};

export async function saveProspect(_: FormState, form: FormData): Promise<FormState> {
  const { membership } = await requireMember();
  const orgId = membership.organizationId;
  const values = Object.fromEntries([...FIELDS.map((f) => f.key), "priority", "searchId"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = prospectSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, values };
  const data = {
    ...(parsed.data as Record<string, string>),
    emailVerified: form.get("emailVerified") === "on",
    searchId: await ownedSearchId(orgId, values.searchId),
  };

  const id = String(form.get("id") ?? "");
  if (id) {
    const res = await db.prospect.updateMany({ where: { id, organizationId: orgId }, data });
    if (!res.count) return { error: "Prospect introuvable." };
    refresh(id);
    return { ok: "Fiche enregistrée.", values };
  }
  const created = await db.prospect.create({ data: { ...data, company: parsed.data.company, organizationId: orgId } });
  refresh();
  redirect(`/app/prospects/${created.id}`);
}

async function findOwned(organizationId: string, id: string) {
  return db.prospect.findFirst({ where: { id, organizationId } });
}

export async function setStatus(id: string, status: string) {
  const { membership } = await requireMember();
  const orgId = membership.organizationId;
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return;
  const p = await findOwned(orgId, id);
  if (!p) return;
  const patch = statusPatch(p, status, await delaysFor(orgId, p.searchId), todayISO());
  await db.prospect.update({ where: { id }, data: patch });
  refresh(id);
}

// Étape de séquence faite (email J0 ou relance envoyée) : statut et prochaine relance mis à jour.
export async function markStepDone(form: FormData) {
  const { membership } = await requireMember();
  const orgId = membership.organizationId;
  const p = await findOwned(orgId, String(form.get("id")));
  if (!p) return;
  const next = (p.status ?? "À contacter") === "À contacter" ? "Contacté" : "Relancé";
  await db.prospect.update({ where: { id: p.id }, data: statusPatch(p, next, await delaysFor(orgId, p.searchId), todayISO()) });
  refresh(p.id);
}

export async function saveQualif(id: string, qualif: Qualif) {
  const { membership } = await requireMember();
  if (!FRAMEWORKS[qualif.fw]) return;
  const v: Record<string, number> = {};
  for (const item of FRAMEWORKS[qualif.fw]) v[item] = Math.max(0, Math.min(2, Number(qualif.v?.[item] ?? 0)));
  await db.prospect.updateMany({ where: { id, organizationId: membership.organizationId }, data: { qualif: { fw: qualif.fw, v } } });
  refresh(id);
}

export async function saveSequence(id: string, steps: Record<string, string>) {
  const { membership } = await requireMember();
  const clean: Record<string, string> = {};
  for (const k of TPL_KEYS) if (typeof steps[k] === "string" && steps[k].trim()) clean[k] = steps[k].slice(0, 10000);
  await db.prospect.updateMany({ where: { id, organizationId: membership.organizationId }, data: { sequence: clean } });
  refresh(id);
  return { ok: true };
}

export async function deleteProspect(form: FormData) {
  const { membership } = await requireAdmin();
  await db.prospect.deleteMany({ where: { id: String(form.get("id")), organizationId: membership.organizationId } });
  refresh();
  redirect("/app/prospects");
}

const MAX_IMPORT = 2000;
export async function importProspects(searchId: string | null, rows: Record<string, string>[]) {
  const { membership } = await requireMember();
  const orgId = membership.organizationId;
  const sid = await ownedSearchId(orgId, searchId);
  const keys = new Set<string>([...FIELDS.map((f) => f.key), "priority", "status"]);
  const data = rows.slice(0, MAX_IMPORT).flatMap((r) => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) if (keys.has(k) && typeof v === "string") o[k] = v.trim().slice(0, 5000);
    if (!o.company) return [];
    if (!["A", "B", "C"].includes(o.priority)) o.priority = "B";
    // Un import démarre toujours « À contacter » : les relances se programment au premier contact.
    o.status = "À contacter";
    return [{ ...o, company: o.company, organizationId: orgId, searchId: sid }];
  });
  if (!data.length) return { count: 0, skipped: rows.length };
  await db.prospect.createMany({ data });
  refresh();
  return { count: data.length, skipped: rows.length - data.length };
}
