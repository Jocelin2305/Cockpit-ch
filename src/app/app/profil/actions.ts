"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import type { FormState } from "@/lib/validation";

export async function saveSignature(_: FormState, form: FormData): Promise<FormState> {
  const { user } = await requireMember();
  const signature = String(form.get("signature") ?? "").trim().slice(0, 1000);
  await db.user.update({ where: { id: user.id }, data: { signature } });
  revalidatePath("/app", "layout");
  return { ok: "Signature enregistrée.", values: { signature } };
}
