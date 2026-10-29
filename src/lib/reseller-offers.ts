// Formules revendeurs et rubriques du centre d'aide affilié : sans dépendance serveur, utilisables côté navigateur.

export type Offer = { id: string; name: string; entry: number; monthly: number; commitment: string; rate: number; perks: string[] };

export const OFFERS: Offer[] = [
  {
    id: "zero_risque",
    name: "Zéro risque",
    entry: 0,
    monthly: 20,
    commitment: "engagement 1 an",
    rate: 0.65,
    perks: ["Aucun coût d'entrée", "Accès aux vidéos support", "1 visio de 30 min par mois", "65 % de commission sur le CA généré"],
  },
  {
    id: "onboarding",
    name: "Onboarding complet",
    entry: 497,
    monthly: 20,
    commitment: "",
    rate: 0.85,
    perks: ["Onboarding complet à l'entrée", "Accès aux vidéos support", "1 visio de 30 min par mois", "85 % de commission sur le CA généré"],
  },
];

export const offerById = (id: string) => OFFERS.find((o) => o.id === id) ?? OFFERS[0];

export const VIDEO_CATEGORIES = [
  { id: "demo", label: "Démonstration" },
  { id: "vente", label: "Vente" },
  { id: "onboarding", label: "Onboarding" },
] as const;

// Paliers affichés dans l'Espace affilié : nombre de clients actifs apportés.
export const MILESTONES = [1, 5, 10, 25, 50, 100];

// Identifiant d'une vidéo YouTube, pour la miniature ; null si le lien n'est pas YouTube.
export function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: n % 1 ? 2 : 0, minimumFractionDigits: n % 1 ? 2 : 0 })} €`;
