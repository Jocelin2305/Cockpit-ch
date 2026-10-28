"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { MAX_LI_RELANCES, MAX_RELANCES, STANDARD_TEMPLATE, TPL_KEYS } from "@/lib/prospecting";

export async function createTemplate() {
  const { membership } = await requireAdmin();
  const t = await db.sequenceTemplate.create({
    data: { organizationId: membership.organizationId, name: "Nouvelle séquence", delays: STANDARD_TEMPLATE.delays, liDelays: STANDARD_TEMPLATE.liDelays, steps: STANDARD_TEMPLATE.steps },
  });
  revalidatePath("/app/sequences");
  redirect(`/app/sequences/${t.id}`);
}

export async function saveTemplate(id: string, input: { name: string; delays: number[]; liDelays: number[]; steps: Record<string, string> }) {
  const { membership } = await requireAdmin();
  const name = input.name.trim().slice(0, 120);
  if (name.length < 2) return { error: "Donnez un nom à la séquence." };
  const bad = (a: number[], max: number) => a.length > max || a.some((n, i) => !(Number.isInteger(n) && n >= 1 && n <= 180) || (i > 0 && n <= a[i - 1]));
  const delays = input.delays.map((n) => Math.round(Number(n)));
  const liDelays = input.liDelays.map((n) => Math.round(Number(n)));
  if (bad(delays, MAX_RELANCES) || bad(liDelays, MAX_LI_RELANCES))
    return { error: `Jusqu'à ${MAX_RELANCES} relances email et ${MAX_LI_RELANCES} LinkedIn, entre J+1 et J+180, chacune après la précédente.` };
  const steps: Record<string, string> = {};
  for (const k of TPL_KEYS) if (typeof input.steps[k] === "string") steps[k] = input.steps[k].slice(0, 10000);
  const res = await db.sequenceTemplate.updateMany({ where: { id, organizationId: membership.organizationId }, data: { name, delays, liDelays, steps } });
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
