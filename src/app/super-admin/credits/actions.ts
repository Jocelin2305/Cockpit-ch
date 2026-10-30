"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { grantCredits } from "@/lib/credits";

// Ajout ou retrait manuel de crédits par le fondateur (geste commercial, virement reçu, correction).
export async function adjustCredits(form: FormData) {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const [type, id] = String(form.get("wallet") ?? "").split(":");
  const amount = parseInt(String(form.get("amount") ?? ""), 10);
  if (!id || !amount) return;
  await grantCredits(type === "r" ? { resellerId: id } : { organizationId: id }, amount, "manuel", String(form.get("label") ?? "").trim().slice(0, 120) || "Ajustement manuel");
  revalidatePath("/super-admin/credits");
}
