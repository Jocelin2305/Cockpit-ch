"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ownedTemplateId } from "@/lib/cockpit";
import { STANDARD_TEMPLATE } from "@/lib/prospecting";

const text = (max = 2000) => z.string().trim().max(max).default("");
const searchSchema = z.object({
  name: z.string().trim().min(2, { error: "Donnez un nom à la recherche (2 caractères minimum)." }).max(100),
  geo: text(), secteur: text(), ca: text(), salaries: text(), motifs: text(), activite: text(),
  prix: text(), diff: text(), fonctions: text(), volume: text(200), ton: text(), notes: text(),
});
export type SearchInput = z.input<typeof searchSchema>;

type Result = { error?: string; id?: string };

export async function createSearch(input: SearchInput, templateChoice: string): Promise<Result> {
  const { user, membership } = await requireAdmin();
  const orgId = membership.organizationId;
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // « standard » : copie du modèle standard, propre à cette recherche ; sinon un modèle existant.
  let templateId = templateChoice === "standard" ? null : await ownedTemplateId(orgId, templateChoice);
  if (!templateId) {
    const t = await db.sequenceTemplate.create({
      data: { organizationId: orgId, name: `Séquence — ${parsed.data.name}`, delays: STANDARD_TEMPLATE.delays, steps: STANDARD_TEMPLATE.steps },
    });
    templateId = t.id;
  }
  const search = await db.search.create({ data: { ...parsed.data, organizationId: orgId, createdById: user.id, templateId } });
  revalidatePath("/app", "layout");
  return { id: search.id };
}

export async function updateSearch(id: string, input: SearchInput, templateId: string): Promise<Result> {
  const { membership } = await requireAdmin();
  const orgId = membership.organizationId;
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const owned = await db.search.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!owned) return { error: "Recherche introuvable." };
  await db.search.update({ where: { id }, data: { ...parsed.data, templateId: await ownedTemplateId(orgId, templateId) } });
  revalidatePath("/app", "layout");
  return { id };
}

export async function deleteSearch(form: FormData) {
  const { membership } = await requireAdmin();
  // Les prospects sont conservés : ils deviennent « sans recherche ».
  await db.search.deleteMany({ where: { id: String(form.get("id")), organizationId: membership.organizationId } });
  revalidatePath("/app", "layout");
  redirect("/app/tableau-de-bord");
}
