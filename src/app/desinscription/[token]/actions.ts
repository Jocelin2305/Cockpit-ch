"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkUnsubscribe } from "@/lib/mail-flow";

// Le prospect ne reçoit plus aucun email ; son adresse rejoint la liste d'opposition de l'entreprise.
export async function unsubscribe(form: FormData) {
  const token = String(form.get("token") ?? "");
  const id = checkUnsubscribe(token);
  const p = id ? await db.prospect.findUnique({ where: { id }, select: { id: true, organizationId: true, email: true, notes: true } }) : null;
  if (!p) redirect(`/desinscription/${encodeURIComponent(token)}`);
  const email = p.email.trim().toLowerCase();
  await db.$transaction([
    db.prospect.update({ where: { id: p.id }, data: { optOutAt: new Date(), status: "Perdu", nextFollowUp: null, notes: [p.notes, "Désinscrit des emails (lien de désinscription)."].filter(Boolean).join(" · ") } }),
    ...(email ? [db.optOut.upsert({ where: { organizationId_email: { organizationId: p.organizationId, email } }, create: { organizationId: p.organizationId, email }, update: {} })] : []),
  ]);
  redirect(`/desinscription/${encodeURIComponent(token)}?ok=1`);
}
