// Marque affichée à un client : celle de son revendeur (marque blanche), sinon Cockpit'ch.
import { db } from "./db";
import { EDITOR } from "./legal";

// Email du support : celui du revendeur pour ses clients, celui de Cockpit'ch pour les clients directs.
export async function supportEmail(org: { resellerId: string | null }) {
  if (!org.resellerId) return EDITOR.email;
  const r = await db.reseller.findUnique({ where: { id: org.resellerId }, select: { managerEmail: true, email: true } });
  return r?.managerEmail || r?.email || EDITOR.email;
}

// Pack de marque d'un distributeur (marque blanche débloquée), appliqué à ses clients et à son lien d'inscription.
export type Brand = { name: string; logo: string; color: string; color2: string; font: string };

const HEX = /^#[0-9a-f]{6}$/i;
export function brandOf(r: { whiteLabel: boolean; active: boolean; brandName: string; brandLogo: string; brandColor: string; brandColor2: string; brandFont: string } | null): Brand | null {
  if (!r || !r.whiteLabel || !r.active) return null;
  return { name: r.brandName.trim(), logo: r.brandLogo, color: HEX.test(r.brandColor) ? r.brandColor : "", color2: HEX.test(r.brandColor2) ? r.brandColor2 : "", font: r.brandFont };
}

const BRAND_SELECT = { whiteLabel: true, active: true, brandName: true, brandLogo: true, brandColor: true, brandColor2: true, brandFont: true } as const;
export async function brandForOrg(org: { resellerId: string | null }) {
  if (!org.resellerId) return null;
  return brandOf(await db.reseller.findUnique({ where: { id: org.resellerId }, select: BRAND_SELECT }));
}
export async function brandForCode(code: string | undefined) {
  if (!code) return null;
  return brandOf(await db.reseller.findFirst({ where: { code: code.trim().toLowerCase() }, select: BRAND_SELECT }));
}

// Variables de couleur et de police qui remplacent celles de Cockpit'ch.
export function brandCss(b: Brand | null) {
  if (!b) return "";
  const v: string[] = [];
  if (b.color) v.push(`--accent: ${b.color};`, `--accent-ink: ${inkOn(b.color)};`);
  if (b.color2) v.push(`--accent-soft: ${b.color2};`);
  if (b.font) v.push(`--f-display: "${b.font}", ui-sans-serif, system-ui, sans-serif;`, `--f-body: "${b.font}", ui-sans-serif, system-ui, sans-serif;`);
  return v.length ? `:root, :root[data-theme="dark"] { ${v.join(" ")} }` : "";
}
export const brandFontHref = (b: Brand | null) => (b?.font ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(b.font)}:wght@400;500;600;700&display=swap` : "");

// Texte blanc ou foncé selon la clarté de la couleur.
function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#14212a" : "#ffffff";
}
