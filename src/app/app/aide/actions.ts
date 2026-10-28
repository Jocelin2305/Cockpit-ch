"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";

export async function setGuide(form: FormData) {
  const { user } = await requireMember();
  await db.user.update({ where: { id: user.id }, data: { guideOn: form.get("on") === "1" } });
  revalidatePath("/app", "layout");
}
