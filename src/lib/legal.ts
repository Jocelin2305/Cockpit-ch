// Identité de l'éditeur, reprise dans les pages légales. À compléter avant le lancement (voir docs/MISE-EN-LIGNE.md).
export const EDITOR = {
  name: "[Raison sociale à compléter]",
  form: "[Forme juridique et capital à compléter]",
  siren: "[SIREN / RCS à compléter]",
  address: "[Adresse du siège à compléter]",
  director: "Jocelin Querteux",
  email: "jocelin.querteux.lms@gmail.com",
  vat: "[N° TVA intracommunautaire à compléter]",
};
export const UPDATED = "28 octobre 2026";

// Sous-traitants techniques (article 28 RGPD).
export const SUBPROCESSORS = [
  { name: "Supabase", role: "Hébergement de la base de données", where: "Union européenne (Paris)" },
  { name: "Vercel", role: "Hébergement de l'application", where: "Union européenne et États-Unis (clauses contractuelles types)" },
  { name: "Anthropic", role: "Fonctions d'intelligence artificielle (Claude)", where: "États-Unis (clauses contractuelles types)" },
  { name: "Stripe", role: "Paiement et facturation", where: "Union européenne et États-Unis (clauses contractuelles types)" },
  { name: "Resend", role: "Emails de la plateforme (invitations, mot de passe)", where: "États-Unis (clauses contractuelles types)" },
  { name: "Google / Microsoft", role: "Boîte mail connectée par l'utilisateur (si activée)", where: "Selon le fournisseur choisi" },
  { name: "Opérateur de téléphonie du client", role: "Appels, enregistrements, transcriptions (si connecté)", where: "Selon l'opérateur choisi" },
];
