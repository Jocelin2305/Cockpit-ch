// Grille des crédits. VALEURS PROVISOIRES : à ajuster d'après les coûts réels (Super admin → Crédits et coûts).
// Sans dépendance serveur : utilisable côté navigateur.

// Prix en crédits de chaque action. `angles` : par prospect ; `email` et `phone` : seulement si la donnée est trouvée.
export const CREDIT_COSTS: Record<string, number> = {
  sequence: 5,
  angles: 1,
  appel: 1,
  ciblage: 2,
  analyse: 2,
  assistant: 1,
  email: 1,
  phone: 8,
};

export const CREDIT_LABELS: Record<string, string> = {
  sequence: "Rédaction d'une séquence",
  angles: "Angles commerciaux",
  appel: "Compte rendu d'appel",
  ciblage: "Ciblage d'une recherche",
  analyse: "Analyse d'une recherche",
  assistant: "Message au Copilote IA",
  email: "Email trouvé",
  phone: "Téléphone trouvé",
};

// Crédits offerts à l'essai d'une entreprise en direct et plafond de consommation par entreprise et par jour.
export const TRIAL_CREDITS = 50;
export const DAILY_CAP = 500;

export type CreditPack = { id: string; credits: number; price: number };

// Recharges en euros, sans abonnement supplémentaire. Valables 12 mois (voir les conditions générales).
export const CREDIT_PACKS: CreditPack[] = [
  { id: "p500", credits: 500, price: 29 },
  { id: "p2000", credits: 2000, price: 99 },
];
// Stock acheté en gros par un revendeur, puis consommé par ses clients.
export const RESELLER_PACKS: CreditPack[] = [
  { id: "r5000", credits: 5000, price: 199 },
  { id: "r20000", credits: 20000, price: 699 },
];
