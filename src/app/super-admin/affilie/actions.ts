"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireReseller } from "@/lib/auth";
import { encrypt, MailError } from "@/lib/mail";
import { validIban, validSiret } from "@/lib/resellers";
import { emailField, firstError, type FormState } from "@/lib/validation";

const text = (label: string, max = 200) => z.string().trim().min(2, `${label} : à compléter.`).max(max, `${label} : trop long.`);

const dossierSchema = z.object({
  companyName: text("Nom de l'entreprise"),
  siret: z.string().transform((v) => v.replace(/\s/g, "")).refine(validSiret, "SIRET invalide (14 chiffres)."),
  address: text("Adresse", 300),
  managerName: text("Nom du gérant"),
  managerEmail: emailField,
  managerPhone: z.string().trim().regex(/^\+?[\d\s.()-]{8,20}$/, "Téléphone du gérant invalide."),
  bic: z.string().trim().toUpperCase().regex(/^([A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?)?$/, "BIC invalide (8 ou 11 caractères)."),
});

// Dossier du revendeur. L'IBAN n'est jamais renvoyé au navigateur : laissé vide, l'IBAN enregistré est conservé.
export async function saveDossier(_: FormState, form: FormData): Promise<FormState> {
  const { reseller } = await requireReseller();
  const values = Object.fromEntries(["companyName", "siret", "address", "managerName", "managerEmail", "managerPhone", "bic"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = dossierSchema.safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  const iban = String(form.get("iban") ?? "").replace(/\s/g, "").toUpperCase();
  if (!iban && !reseller.ibanLast4) return { error: "IBAN : à compléter.", values };
  if (iban && !validIban(iban)) return { error: "IBAN invalide : vérifiez sa saisie.", values };
  let ibanData = {};
  try {
    if (iban) ibanData = { ibanEnc: encrypt(iban), ibanLast4: iban.slice(-4) };
  } catch (e) {
    return { error: e instanceof MailError ? "Enregistrement de l'IBAN impossible pour le moment : contactez le support." : "Enregistrement impossible.", values };
  }
  await db.reseller.update({ where: { id: reseller.id }, data: { ...parsed.data, ...ibanData } });
  revalidatePath("/super-admin/affilie");
  return { ok: "Dossier enregistré." };
}
