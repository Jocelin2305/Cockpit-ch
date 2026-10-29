// Identité de l'éditeur, reprise dans les pages légales. À compléter avant le lancement (voir docs/MISE-EN-LIGNE.md).
export const EDITOR = {
  name: "Dundee SaaS",
  form: "Micro-entreprise",
  // SIRET. Micro-entreprise en franchise de TVA : laisser vat vide affiche « TVA non applicable, art. 293 B du CGI ».
  siren: "951 917 863 00023",
  address: "51 rue renée auduc - Le Mans 72000",
  director: "Jocelin Querteux",
  email: "jocelin.querteux.lms@gmail.com",
  vat: "",
};
export const UPDATED = "28 octobre 2026";
// Prise de rendez-vous avec le fondateur (page d'accueil, programme partenaire).
export const BOOKING_URL = "https://calendar.app.google/QWaG1gXHXnJtrVgE9";

// Sous-traitants techniques (article 28 RGPD).
export const SUBPROCESSORS = [
  { name: "Supabase", role: "Hébergement de la base de données", where: "Union européenne (Paris)" },
  { name: "Vercel", role: "Hébergement de l'application", where: "Union européenne et États-Unis (clauses contractuelles types)" },
  { name: "Anthropic", role: "Fonctions d'intelligence artificielle (Claude)", where: "États-Unis (clauses contractuelles types)" },
  { name: "Stripe", role: "Paiement et facturation", where: "Union européenne et États-Unis (clauses contractuelles types)" },
  { name: "Resend", role: "Emails de la plateforme (invitations, mot de passe)", where: "États-Unis (clauses contractuelles types)" },
  { name: "Google / Microsoft", role: "Boîte mail connectée par l'utilisateur (si activée)", where: "Selon le fournisseur choisi" },
  { name: "Apollo.io", role: "Enrichissement des contacts, avec le compte du client (si connecté)", where: "États-Unis (clauses contractuelles types)" },
  { name: "Opérateur de téléphonie du client", role: "Appels, enregistrements, transcriptions (si connecté)", where: "Selon l'opérateur choisi" },
];
