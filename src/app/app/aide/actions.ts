"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";

export async function setGuide(form: FormData) {
  const { user } = await requireMember();
  await db.user.update({ where: { id: user.id }, data: { guideOn: form.get("on") === "1" } });
  revalidatePath("/app", "layout");
}

// Visite guidée : étape suivante, ou null pour la terminer.
export async function setTourStep(step: number | null) {
  const { user } = await requireMember();
  await db.user.update({ where: { id: user.id }, data: { tourStep: step === null ? null : Math.max(0, Math.min(50, Math.round(step))) } });
}

export async function restartTour() {
  const { user } = await requireMember();
  await db.user.update({ where: { id: user.id }, data: { tourStep: 0, guideOn: true } });
  redirect("/app/point-du-jour");
}
