// Offres distributeurs (engagement 1 an), options, coûts tiers et rubriques du centre de vidéos.
// Sans dépendance serveur : utilisable côté navigateur. Prix en euros HT.

export type Offer = {
  id: "A" | "B" | "C";
  name: string;
  monthly: number;
  annual: number;
  rate: number;
  support: string;
  supportHours: number;
  includes: string[];
};

export const OFFERS: Offer[] = [
  {
    id: "A", name: "Offre A", monthly: 39, annual: 390, rate: 0.15, supportHours: 48,
    support: "Support par email assuré par Cockpit'ch, réponse sous 48 h, nombre de demandes limité chaque mois",
    includes: ["Droits de distribution", "Accès au centre de vidéos de vente"],
  },
  {
    id: "B", name: "Offre B", monthly: 99, annual: 990, rate: 0.05, supportHours: 48,
    support: "Vous assurez le support de vos clients ; visio avec notre équipe au besoin",
    includes: ["Tout de l'offre A"],
  },
  {
    id: "C", name: "Offre C", monthly: 249, annual: 2490, rate: 0, supportHours: 4,
    support: "Support prioritaire inclus (réponse cible sous 4 h)",
    includes: ["Tout de l'offre B", "Marque blanche (votre nom, logo, couleurs, typographie)", "1 demande de fonctionnalité par trimestre"],
  },
];

export const offerById = (id: string) => OFFERS.find((o) => o.id === id) ?? OFFERS[0];
export const offerPrice = (o: Offer, billing: string) => (billing === "annuel" ? o.annual : o.monthly);

// Options proposées seulement après le choix de l'offre A ou B (l'offre C les inclut).
export const WHITE_LABEL_PRICE = 997;
export const PRIORITY_SUPPORT_MONTHLY = 15;
export const PRIORITY_SUPPORT_HOURS = 4;
// 3 échéances au centime près, la dernière ajustée : 332,33 + 332,33 + 332,34.
export const whiteLabelInstallments = (n: number) => {
  if (n !== 3) return [WHITE_LABEL_PRICE];
  const part = Math.floor((WHITE_LABEL_PRICE / 3) * 100) / 100;
  return [part, part, Math.round((WHITE_LABEL_PRICE - part * 2) * 100) / 100];
};
export const hasUpsells = (offerId: string) => offerId === "A" || offerId === "B";

// Coûts tiers à la charge du distributeur, affichés sur la page d'offre.
export const THIRD_PARTY_COSTS = ["crédits d'IA et d'enrichissement consommés par vos clients, achetés en packs dans votre Espace affilié"];

// Minimum versé par client actif, indépendant du prix de revente : désactivé (0).
export const MIN_COMMISSION_PER_ACTIVE_CLIENT = 0;

// Le distributeur a-t-il droit à la marque blanche (offre C ou option achetée) et au support prioritaire ?
export const whiteLabelEligible = (r: { offer: string; upsellWhiteLabel: boolean }) => r.offer === "C" || r.upsellWhiteLabel;
export const prioritySupport = (r: { offer: string; upsellPriority: boolean }) => r.offer === "C" || r.upsellPriority;

// Abonnement mensuel équivalent du distributeur chez nous (option prioritaire comprise).
export const resellerMonthlyFee = (r: { offer: string; billing: string; upsellPriority: boolean }) => {
  const o = offerById(r.offer);
  return (r.billing === "annuel" ? o.annual / 12 : o.monthly) + (hasUpsells(r.offer) && r.upsellPriority ? PRIORITY_SUPPORT_MONTHLY : 0);
};

export const VIDEO_CATEGORIES = [
  { id: "demo", label: "Démonstration" },
  { id: "vente", label: "Vente" },
  { id: "onboarding", label: "Onboarding" },
] as const;

// Identifiant d'une vidéo YouTube, pour la miniature ; null si le lien n'est pas YouTube.
export function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: n % 1 ? 2 : 0, minimumFractionDigits: n % 1 ? 2 : 0 })} €`;

// Typographies proposées dans le pack de marque (Google Fonts).
export const BRAND_FONTS = ["", "Inter", "Poppins", "Montserrat", "Lato", "Nunito", "Raleway", "Work Sans"];
// Noms et marques de tiers interdits dans le pack de marque.
export const FORBIDDEN_BRAND = /anthropic|claude|apollo/i;
