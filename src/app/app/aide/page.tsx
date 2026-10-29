import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { supportEmail } from "@/lib/branding";

export const metadata: Metadata = { title: "Centre d'aide" };


const HOWTO = [
  { q: "Démarrer une prospection", a: "« + Créer une recherche » : le questionnaire prépare la cible et la séquence emails + LinkedIn. Importez ou ajoutez ensuite vos prospects." },
  { q: "Savoir quoi faire chaque matin", a: "En ouvrant le Copilote IA, votre agent IA vous fait le point du jour : appels à passer, relances dues, emails J0 prêts, réponses reçues. Suivez-le de haut en bas, puis posez-lui vos questions." },
  { q: "Appeler un prospect", a: "Cliquez sur son numéro : l'appel se lance et un panneau s'ouvre pour noter ce qui se dit. À la fin, enregistrez : statut, rappel et qualification se mettent à jour." },
  { q: "Saisir un appel passé ailleurs", a: "Bouton téléphone en bas à droite de l'écran : cherchez le prospect, tapez vos notes, enregistrez." },
  { q: "Envoyer une relance", a: "Ouvrez la fiche : le texte de la relance est prêt à copier. Marquez l'étape comme faite, la suivante se programme seule." },
  { q: "Ajouter une info sur un prospect", a: "Colonne « Notes » du tableau de suivi : cliquez, écrivez, l'info est enregistrée en quittant le champ." },
];

export default async function HelpPage() {
  const { membership } = await requireMember();
  // Support du revendeur pour ses clients, de Cockpit'ch sinon.
  const SUPPORT = await supportEmail(membership.organization);
  return (
    <div className="view narrow">
      <header className="view-head">
        <div><h1>Centre d&apos;aide</h1><p className="muted">Guide de prise en main, réponses rapides et support.</p></div>
      </header>

      <section className="panel">
        <h2>Comment faire</h2>
        <div className="list">
          {HOWTO.map((h) => (
            <details key={h.q} className="li faq"><summary><b>{h.q}</b></summary><p className="muted">{h.a}</p></details>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Support</h2>
        <p className="muted">Une question, un bug, une idée ?</p>
        <div className="row"><a className="btn" href={`mailto:${SUPPORT}?subject=${encodeURIComponent("Support")}`}>Écrire au support</a></div>
      </section>
    </div>
  );
}
