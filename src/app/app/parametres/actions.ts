"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireMember } from "@/lib/auth";
import { firstError, nameField, type FormState } from "@/lib/validation";

export async function renameOrganization(_: FormState, form: FormData): Promise<FormState> {
  const { membership } = await requireAdmin();
  const values = { name: String(form.get("name") ?? "") };
  const parsed = nameField.safeParse(values.name);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  await db.organization.update({ where: { id: membership.organizationId }, data: { name: parsed.data } });
  revalidatePath("/app", "layout");
  return { ok: "Nom de l'entreprise enregistré.", values: { name: parsed.data } };
}

export async function saveSignature(_: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireMember();
  const signature = String(form.get("signature") ?? "").trim().slice(0, 1000);
  await db.user.update({ where: { id: user.id }, data: { signature } });
  revalidatePath("/app", "layout");
  return { ok: "Signature enregistrée.", values: { signature } };
}
