import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { SubmitButton } from "@/components/forms";
import { restartTour, setGuide } from "./actions";

export const metadata: Metadata = { title: "Centre d'aide" };

const SUPPORT = "jocelin.querteux.lms@gmail.com";

const HOWTO = [
  { q: "Démarrer une prospection", a: "« + Créer une recherche » : le questionnaire prépare la cible et la séquence emails + LinkedIn. Importez ou ajoutez ensuite vos prospects." },
  { q: "Savoir quoi faire chaque matin", a: "Le Point du jour s'ouvre à la connexion : appels à passer, relances dues, emails J0 prêts. Suivez-le de haut en bas." },
  { q: "Appeler un prospect", a: "Cliquez sur son numéro : l'appel se lance et un panneau s'ouvre pour noter ce qui se dit. À la fin, enregistrez : statut, rappel et qualification se mettent à jour." },
  { q: "Saisir un appel passé ailleurs", a: "Bouton téléphone en bas à droite de l'écran : cherchez le prospect, tapez vos notes, enregistrez." },
  { q: "Envoyer une relance", a: "Ouvrez la fiche : le texte de la relance est prêt à copier. Marquez l'étape comme faite, la suivante se programme seule." },
  { q: "Ajouter une info sur un prospect", a: "Colonne « Notes » du tableau de suivi : cliquez, écrivez, l'info est enregistrée en quittant le champ." },
];

export default async function HelpPage() {
  const { user } = await requireMember();
  return (
    <div className="view narrow">
      <header className="view-head">
        <div><h1>Centre d&apos;aide</h1><p className="muted">Guide de prise en main, réponses rapides et support.</p></div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Guide interactif</h2>
          <span className={`chip ${user.guideOn ? "ok" : ""}`}>{user.guideOn ? "Activé" : "Désactivé"}</span>
        </div>
        <p className="muted">Des infobulles s&apos;affichent sur les boutons et les zones clés pour expliquer leur rôle. Repérez les points orange, survolez-les.</p>
        <form action={setGuide} className="row">
          <input type="hidden" name="on" value={user.guideOn ? "0" : "1"} />
          <SubmitButton pending="…">{user.guideOn ? "Désactiver le guide" : "Activer le guide"}</SubmitButton>
        </form>
        <form action={restartTour} className="row">
          <SubmitButton className="btn" pending="…">Lancer la visite guidée pas à pas</SubmitButton>
        </form>
      </section>

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
        <div className="row"><a className="btn" href={`mailto:${SUPPORT}?subject=${encodeURIComponent("[Cockpit'ch] Support")}`}>Écrire au support</a></div>
      </section>
    </div>
  );
}
