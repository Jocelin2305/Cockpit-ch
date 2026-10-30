import type { Metadata } from "next";
import { EDITOR, SUBPROCESSORS, UPDATED } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Privacy() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="muted">Dernière mise à jour : {UPDATED}.</p>

      <h2>Qui traite vos données ?</h2>
      <p>Pour les comptes utilisateurs et la facturation, {EDITOR.name} est responsable de traitement. Pour les données de prospects saisies par un client, ce client est responsable de traitement et {EDITOR.name} agit comme sous-traitant, uniquement sur ses instructions.</p>

      <h2>Données traitées</h2>
      <ul>
        <li>Comptes : nom, email, mot de passe (stocké sous forme chiffrée irréversible), rôle, dates de connexion.</li>
        <li>Facturation : entreprise, adresse, n° TVA ; les cartes bancaires sont gérées par Stripe, jamais par Cockpit&apos;ch.</li>
        <li>Prospection : entreprises et contacts professionnels (nom, fonction, email et téléphone professionnels, LinkedIn), notes, emails échangés, appels et transcriptions si la téléphonie est connectée. Ces données proviennent du client (saisie, import), du registre national des entreprises (Sirene / RNE, données publiques) et du service d&apos;enrichissement Apollo.io, utilisé à la demande du client. Pour ces données de prospection, le client est responsable du traitement : il prospecte sur la base de l&apos;intérêt légitime, avec des messages liés à la fonction de la personne et une possibilité simple de s&apos;opposer.</li>
        <li>Usage : journaux techniques et consommation de l&apos;IA, pour la sécurité et le bon fonctionnement.</li>
      </ul>

      <h2>Finalités et bases légales</h2>
      <p>Fournir le service (exécution du contrat), facturer (obligation légale), sécuriser et améliorer le service (intérêt légitime). Aucune revente de données, aucune publicité. Les données des clients ne servent pas à entraîner des modèles d&apos;IA.</p>

      <h2>Durées de conservation</h2>
      <p>Pendant l&apos;abonnement, puis 90 jours après sa fin avant suppression. Les factures sont conservées 10 ans (obligation comptable). Le client peut tout supprimer plus tôt depuis Paramètres.</p>

      <h2>Sous-traitants</h2>
      <ul>
        {SUBPROCESSORS.map((s) => <li key={s.name}><b>{s.name}</b> : {s.role} ({s.where}).</li>)}
      </ul>

      <h2>Sécurité</h2>
      <p>Connexions chiffrées (HTTPS), données isolées par entreprise, accès de la messagerie connectée chiffrés, protection contre les tentatives de connexion répétées.</p>

      <h2>Vos droits</h2>
      <p>Accès, rectification, effacement, limitation, opposition et portabilité : écrivez à <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>. Si vous êtes un prospect contacté via Cockpit&apos;ch, adressez-vous d&apos;abord à l&apos;entreprise qui vous a contacté. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
    </>
  );
}
