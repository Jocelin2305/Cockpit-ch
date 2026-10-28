"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { STANDARD_TEMPLATE, TPL_KEYS } from "@/lib/prospecting";

export async function createTemplate() {
  const { membership } = await requireAdmin();
  const t = await db.sequenceTemplate.create({
    data: { organizationId: membership.organizationId, name: "Nouvelle séquence", delays: STANDARD_TEMPLATE.delays, steps: STANDARD_TEMPLATE.steps },
  });
  revalidatePath("/app/sequences");
  redirect(`/app/sequences/${t.id}`);
}

export async function saveTemplate(id: string, input: { name: string; delays: number[]; steps: Record<string, string> }) {
  const { membership } = await requireAdmin();
  const name = input.name.trim().slice(0, 120);
  if (name.length < 2) return { error: "Donnez un nom à la séquence." };
  const delays = input.delays.map((n) => Math.round(Number(n)));
  if (delays.length !== 5 || delays.some((n, i) => !(n >= 1 && n <= 120) || (i > 0 && n <= delays[i - 1])))
    return { error: "Les 5 relances doivent être entre J+1 et J+120, chacune après la précédente." };
  const steps: Record<string, string> = {};
  for (const k of TPL_KEYS) if (typeof input.steps[k] === "string") steps[k] = input.steps[k].slice(0, 10000);
  const res = await db.sequenceTemplate.updateMany({ where: { id, organizationId: membership.organizationId }, data: { name, delays, steps } });
  if (!res.count) return { error: "Séquence introuvable." };
  revalidatePath("/app", "layout");
  return { ok: "Séquence enregistrée." };
}

export async function deleteTemplate(form: FormData) {
  const { membership } = await requireAdmin();
  // Les recherches qui l'utilisaient passent sans séquence (lien remis à vide par la base).
  await db.sequenceTemplate.deleteMany({ where: { id: String(form.get("id")), organizationId: membership.organizationId } });
  revalidatePath("/app", "layout");
  redirect("/app/sequences");
}
