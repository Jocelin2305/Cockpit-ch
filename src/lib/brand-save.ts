// Enregistrement du pack de marque d'un distributeur, par lui-même ou par le fondateur.
import { revalidatePath } from "next/cache";
import { db } from "./db";
import { BRAND_FONTS, FORBIDDEN_BRAND } from "./reseller-offers";
import type { FormState } from "./validation";

const HEX = /^#[0-9a-f]{6}$/i;
const LOGO_MAX = 300_000;

export async function saveBrand(resellerId: string, form: FormData): Promise<FormState> {
  const name = String(form.get("brandName") ?? "").trim().slice(0, 40);
  const color = String(form.get("brandColor") ?? "").trim();
  const color2 = String(form.get("brandColor2") ?? "").trim();
  const font = String(form.get("brandFont") ?? "");
  const logo = String(form.get("brandLogo") ?? "");
  if (name.length < 2) return { error: "Donnez un nom à votre plateforme (2 caractères minimum)." };
  if (FORBIDDEN_BRAND.test(name)) return { error: "Les noms et marques de tiers (Anthropic, Claude, Apollo) ne peuvent pas être utilisés." };
  if ((color && !HEX.test(color)) || (color2 && !HEX.test(color2))) return { error: "Couleur invalide." };
  if (!BRAND_FONTS.includes(font)) return { error: "Typographie inconnue." };
  if (logo && (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(logo) || logo.length > LOGO_MAX)) return { error: "Logo invalide ou trop lourd (300 Ko maximum)." };
  await db.reseller.update({ where: { id: resellerId }, data: { brandName: name, brandColor: color, brandColor2: color2, brandFont: font, ...(form.get("removeLogo") === "1" ? { brandLogo: "" } : logo ? { brandLogo: logo } : {}) } });
  revalidatePath("/", "layout");
  return { ok: "Marque enregistrée : elle s'applique à vos clients et à votre lien d'inscription." };
}
