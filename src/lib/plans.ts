// Offres commerciales. PRIX ET LIMITES PROVISOIRES : à remplacer par vos décisions (voir docs/LANCEMENT.md, étape 3).
// Le prix facturé est celui du « Price » Stripe dont l'identifiant est dans la variable d'environnement indiquée ;
// `price` ne sert qu'à l'affichage et au calcul du revenu mensuel dans le super admin.

export type Plan = { id: string; name: string; price: number; seats: number; credits: number; priceEnv: string; pitch: string; features: string[] };

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    price: 49,
    seats: 1,
    credits: 500,
    priceEnv: "STRIPE_PRICE_SOLO",
    pitch: "Pour un commercial ou un dirigeant qui prospecte seul.",
    features: ["1 utilisateur", "500 crédits par mois (IA et contacts)", "Recherches et prospects illimités", "Séquences emails + LinkedIn", "Assistant IA"],
  },
  {
    id: "equipe",
    name: "Équipe",
    price: 149,
    seats: 5,
    credits: 2000,
    priceEnv: "STRIPE_PRICE_EQUIPE",
    pitch: "Pour une équipe commerciale, avec administrateurs et commerciaux.",
    features: ["Jusqu'à 5 utilisateurs", "2 000 crédits par mois (IA et contacts)", "Tout le plan Solo", "Rôles administrateur / commercial", "File d'appels partagée"],
  },
];

export const TRIAL_DAYS = 14;
// Essai d'une entreprise apportée par un partenaire revendeur (lien ou code affilié) : un mois offert.
export const PARTNER_TRIAL_DAYS = 30;
// Pendant l'essai, l'entreprise a accès aux fonctions du plan le plus complet.
export const TRIAL_SEATS = 5;

export const planById = (id: string | null | undefined) => PLANS.find((p) => p.id === id) ?? null;
export const priceIdFor = (plan: Plan) => process.env[plan.priceEnv] || null;
export const planByPriceId = (priceId: string | null | undefined) => PLANS.find((p) => priceId && priceIdFor(p) === priceId) ?? null;
