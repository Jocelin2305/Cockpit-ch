import type { Metadata } from "next";
import Link from "next/link";
import { EDITOR, UPDATED } from "@/lib/legal";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function Terms() {
  return (
    <>
      <h1>Conditions générales d&apos;utilisation et de vente</h1>
      <p className="muted">Dernière mise à jour : {UPDATED}. Service réservé aux professionnels.</p>

      <h2>1. Objet</h2>
      <p>Cockpit&apos;ch, édité par {EDITOR.name}, est un logiciel en ligne de prospection commerciale B2B : recherches de prospects, séquences email et LinkedIn, suivi des appels, assistant d&apos;intelligence artificielle. Les présentes conditions encadrent son utilisation par l&apos;entreprise cliente (le « Client ») et ses utilisateurs.</p>

      <h2>2. Compte et accès</h2>
      <p>Le Client crée un espace et en devient administrateur. Il invite ses utilisateurs et répond de leur usage. Les identifiants sont personnels et confidentiels. L&apos;éditeur peut accéder à l&apos;espace du Client pour le support, le paramétrage demandé ou la sécurité du service.</p>

      <h2>3. Essai, abonnement et paiement</h2>
      <p>Un essai gratuit de {TRIAL_DAYS} jours est proposé, sans carte bancaire. Au-delà, l&apos;accès nécessite un abonnement mensuel ({PLANS.map((p) => `${p.name} : ${p.price} € HT`).join(", ")}), payé par carte via Stripe et renouvelé automatiquement. Le Client peut résilier à tout moment depuis son espace ; l&apos;accès reste ouvert jusqu&apos;à la fin de la période payée. Sans paiement, l&apos;accès est suspendu et les données conservées 90 jours avant suppression.</p>

      <h2>4. Obligations du Client</h2>
      <p>Le Client utilise le service dans le respect des lois applicables, notamment le RGPD et les règles de prospection commerciale : information des personnes démarchées, droit d&apos;opposition à chaque message, et conditions d&apos;utilisation des plateformes tierces (LinkedIn, messageries, téléphonie). Il est seul responsable des prospects qu&apos;il importe et des messages qu&apos;il envoie. Il s&apos;interdit tout envoi massif non sollicité, tout contenu illicite et toute atteinte à la sécurité du service.</p>

      <h2>5. Intelligence artificielle</h2>
      <p>Les textes générés par l&apos;IA (angles, emails, comptes rendus) sont des propositions : le Client les relit avant usage. L&apos;IA ne doit pas inventer d&apos;informations ; une donnée manquante est signalée « À enrichir ».</p>

      <h2>6. Données</h2>
      <p>Pour les données de prospects et d&apos;utilisateurs, le Client est responsable de traitement et l&apos;éditeur agit comme sous-traitant, selon la <Link href="/confidentialite">politique de confidentialité</Link>. Le Client peut exporter ou supprimer ses données à tout moment depuis Paramètres.</p>

      <h2>7. Disponibilité et responsabilité</h2>
      <p>L&apos;éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité du service (obligation de moyens). Sa responsabilité est limitée aux montants payés par le Client sur les 12 derniers mois et exclut les dommages indirects (perte de chiffre d&apos;affaires, de clientèle).</p>

      <h2>8. Évolution et droit applicable</h2>
      <p>Ces conditions peuvent évoluer ; le Client est prévenu 30 jours avant toute modification importante. Droit français ; à défaut d&apos;accord amiable, compétence des tribunaux du ressort du siège de l&apos;éditeur. Contact : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>.</p>
    </>
  );
}
