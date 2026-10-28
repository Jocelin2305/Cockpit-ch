"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { newToken, requireAdmin, requireMember } from "@/lib/auth";
import { isPhoneProvider } from "@/lib/telephony";

export async function connectPhone(form: FormData) {
  const { membership } = await requireAdmin();
  const provider = String(form.get("provider"));
  if (!isPhoneProvider(provider) || membership.organization.isDemo) return;
  await db.organization.update({ where: { id: membership.organizationId }, data: { phoneProvider: provider, phoneWebhookToken: newToken() } });
  revalidatePath("/app/parametres");
}

export async function disconnectPhone() {
  const { membership } = await requireAdmin();
  await db.organization.update({ where: { id: membership.organizationId }, data: { phoneProvider: null, phoneWebhookToken: null } });
  revalidatePath("/app/parametres");
}

// Appel manqué ou message vocal traité : il disparaît du Point du jour.
export async function markPhoneEventHandled(form: FormData) {
  const { membership } = await requireMember();
  await db.phoneEvent.updateMany({ where: { id: String(form.get("id")), organizationId: membership.organizationId }, data: { handled: true } });
  revalidatePath("/app");
}
